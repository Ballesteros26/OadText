import KeyboardEventEmitter from 'engine/Events/Input/KeyboardEventEmitter';
import { Pond } from 'engine/Pond/Pond';
import EventEmitter from 'eventemitter3';
import qrCodeFactory from 'qrcode-generator';
import * as PIXI from 'pixi.js';
import z from 'zod';
import type Channel from 'engine/Pond/Channel';
import once from 'engine/Events/once';
import type { RemotePayload } from 'src/remotePayload';
import $click from 'src/sounds/click.wav';
import $dingding from 'src/sounds/dingding.wav';
import $whaa from 'src/sounds/whaa.wav';

export const POND_URL = '';
const ROOM = 'id';

const soundsDefault = [$click];
const soundsToad = [$dingding, $dingding, $whaa];

let sounds = soundsDefault;

export class RemoteEventEmitter extends EventEmitter<{
	num(type: '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9'): void;
	p(type: '1' | '-1'): void;
	color(c: 'RED' | 'GREEN' | 'YELLOW' | 'BLUE'): void;
	connected(): void;
	disconnected(): void;
}> {
	public connected = false;
	public texture: PIXI.Texture | null = null;
	public isConnected = false;
	private lobbyId;
	private sendEE = new EventEmitter<{ payload(p: RemotePayload): void }>();
	private connectionCount = 0;
	private soundIndex = 0;

	constructor() {
		super();
		this.addKeyboardFallback();
		// cypto is not available in insecure context
		// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
		this.lobbyId = crypto.randomUUID?.().split('-')[0] ?? Math.random() * 100000 | 0;

		PIXI.Assets.load(this.getQrCode(this.lobbyId).createDataURL(1, 1)).then(e => {
			this.texture = e.textures[0];
		});
		this.waitForRemote();
	}

	addKeyboardFallback() {
		const fallback = new KeyboardEventEmitter();

		fallback.on('keydown', e => {
			sounds[this.soundIndex++ % sounds.length].play();
			if (e.label === '0') this.emit('num', '0');
			if (e.label === '1') this.emit('num', '1');
			else if (e.label === '2') this.emit('num', '2');
			else if (e.label === '3') this.emit('num', '3');
			else if (e.label === '4') this.emit('num', '4');
			else if (e.label === '5') this.emit('num', '5');
			else if (e.label === '6') this.emit('num', '6');
			else if (e.label === '7') this.emit('num', '7');
			else if (e.label === '8') this.emit('num', '8');
			else if (e.label === '9') this.emit('num', '9');
			else if (e.key === 'ArrowUp') this.emit('p', '1');
			else if (e.key === 'ArrowDown') this.emit('p', '-1');
			else if (e.key === 'ArrowRight') this.emit('p', '1');
			else if (e.key === 'ArrowLeft') this.emit('p', '-1');
			else if (e.label === 'a') this.emit('color', 'RED');
			else if (e.label === 's') this.emit('color', 'GREEN');
			else if (e.label === 'd') this.emit('color', 'YELLOW');
			else if (e.label === 'f') this.emit('color', 'BLUE');
		});
	}

	getUrl() {
		var url = new URL(window.location.href);
		url.searchParams.set(ROOM, `${this.lobbyId}`);
		console.log('For remote, open this on you mobile phone', url.href);
		return url.href;
	}
	getQrCode() {
		const qr = qrCodeFactory(0, 'L');
		const href = this.getUrl();
		qr.addData(href);

		qr.make();
		console.log(qr.createASCII());
		return qr;
	}

	async waitForRemote() {
		const pond = new Pond(POND_URL);
		const channel = await pond.joinChannel(`${this.lobbyId}`);
		console.log('connected');

		if (!this.connected) {
			this.emit('connected');
		}
		this.connected = true;
		this.connectionCount++;

		// open new lobby to catch remote
		this.waitForRemote();

		await this.loopEvents(channel);

		// // TODO wäre es gut wenn der player in der response steht?
		// const ehi = await channel.all()
		// 	// TODO mit lock mechanismus ergibt send keinen sinn, können dann einfach direkt das promise zurück geben
		// 	// ODER implizit irgendwie nen Promise.all ausführen
		// 	.do({
		// 		player: playerA,
		// 		schema: z.number(),
		// 		async getValue() {
		// 			return 420;
		// 		},
		// 	})
		// 	.do({
		// 		player: playerB,
		// 		schema: z.string(),
		// 		async getValue() {
		// 			// await new Promise(res => setTimeout(res, 1600))
		// 			return 'hi';
		// 		},
		// 	})
		// 	.orElse({
		// 		schema: z.number(),
		// 		async getValue() {
		// 			return 69;
		// 		},
		// 	}, 1000);
		// // .orElseWait(1000);

		// console.log(ehi);
		// ehi[1].success && console.log(ehi[1].data);

		// const p2p = await createPeer2PeerConnection(playerA, playerB, channel);

		// if (!p2p.success) {
		// 	console.log('p2p failed');
		// 	return 364;
		// }

		// const [channelA, channelB] = p2p.data;

		// console.log(playerA.isLocalPlayer ? 'A' : 'B');
		// if (playerA.isLocalPlayer) {
		// 	setTimeout(() => {
		// 		channelA!.send('hi');
		// 	}, 100);
		// 	channelB!.addEventListener('message', (e) => {
		// 		console.log('B', e.data);
		// 	});
		// }

		// if (playerB.isLocalPlayer) {
		// 	setTimeout(() => {
		// 		channelB!.send('geih');
		// 	}, 100);
		// 	channelA!.addEventListener('message', (e) => {
		// 		console.log('A', e.data);
		// 	});
		// }

		// // wait forever
		// return await new Promise<number>(() => {});
	}

	async loopEvents(channel: Channel) {
		await Promise.race([
			this.loopGet(channel),
			this.loopPost(channel),
		]);
	}

	async loopGet(channel: Channel) {
		const [playerA, playerB] = channel.getPlayers();

		while (true) {
			const command = await channel.doForPlayer({
				schema: z.string(),
				timeout: -1,
				player: playerA.isLocalPlayer ? playerB : playerA,
				getValue() {
					throw new Error('False Host');
				},
			});

			if (command.success) {
				const [type, value] = command.data.split(':');
				// @ts-expect-error
				this.emit(type, value);
			} else {
				console.log('Connection to remote broke');
				this.connectionCount--;
				if (this.connectionCount == 0) {
					this.connected = false;
					this.emit('disconnected');
				}
				break;
			}
		}
	}

	async loopPost(channel: Channel) {
		const [playerA, playerB] = channel.getPlayers();

		const ee = this.sendEE;

		while (true) {
			const command = await channel.doForPlayer({
				schema: z.string(),
				timeout: -1,
				player: playerA.isLocalPlayer ? playerA : playerB,
				async getValue() {
					const es = await once(ee, 'payload');
					return es.value;
				},
			});
		}
	}

	send(payload: RemotePayload) {
		if (payload === 'crazy-toad') {
			sounds = soundsToad;
		}
		this.sendEE.emit('payload', payload);
	}
}
