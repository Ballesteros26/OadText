import Process from 'engine/Process/Process';
import { component } from 'engine/View/Decorators';
import { POND_URL } from './remote/RemoteEventEmitter';
import { Pond } from 'engine/Pond/Pond';
import z from 'zod';
import EventEmitter from 'eventemitter3';
import once from 'engine/Events/once';
import RemoteUi from './remote/RemoteUi';
import type Channel from 'engine/Pond/Channel';
import { RemotePayloadSchema } from './remotePayload';
import $dingding from './sounds/dingding.wav';
import $whaa from './sounds/whaa.wav';
import $click from './sounds/click.wav';

const soundsDefault = [$click];
const soundsToad = [$dingding, $dingding, $whaa];

let sounds = soundsDefault;

export default class Mobile extends Process<number> {
	private ee = new EventEmitter<{ key: string }>();
	private click = 0;
	private buttonColor = 0xdddddd;
	private soundIndex = 0;

	constructor(private roomId: string) {
		super();

		this.connect();
	}

	async connect() {
		const pond = new Pond(POND_URL);

		const channel = await pond.joinChannel(this.roomId);

		await Promise.race([
			this.loopPost(channel),
			this.loopGet(channel),
		]);
	}

	async loopPost(channel: Channel) {
		const [playerA, playerB] = channel.getPlayers();

		const ee = this.ee;

		while (true) {
			await channel.doForPlayer({
				schema: z.string(),
				timeout: -1,
				player: playerA.isLocalPlayer ? playerA : playerB,
				async getValue() {
					const eig = await once(ee, 'key');

					return eig.value;
				},
			});
		}
	}

	async loopGet(channel: Channel) {
		const [playerA, playerB] = channel.getPlayers();

		while (true) {
			const command = await channel.doForPlayer({
				schema: RemotePayloadSchema,
				timeout: -1,
				player: playerA.isLocalPlayer ? playerB : playerA,
				getValue() {
					throw new Error('False Host');
				},
			});

			if (command.success) {
				if (command.data === 'red-buttons') {
					this.buttonColor = 0xFF0000;
				}
				if (command.data === 'blue-buttons') {
					this.buttonColor = 0x0000FF;
				}
				if (command.data === 'crazy-toad') {
					sounds = soundsToad;
				}
			} else {
				alert('Connection to remote broke');
				// this.connected = false;
				// this.emit('disconnected');

				break;
			}
		}
	}

	@component()
	public View({ width, height }: { width: number; height: number }) {
		return (
			<>
				<RemoteUi
					buttonColor={this.buttonColor}
					width={width}
					height={height}
					margin={10}
					gap={20}
					// eslint-disable-next-line quack-engine/set-eventMode
					onClick={(e) => {
						sounds[this.soundIndex++ % sounds.length].play();
						if (e.length === 1) {
							this.ee.emit('key', `num:${e}`);
						} else if (e.length === 2) {
							this.ee.emit('key', `p:${e === 'P-' ? -1 : 1}`);
						} else {
							this.ee.emit('key', `color:${e}`);
						}
					}}
				/>
			</>
		);
	}
}
