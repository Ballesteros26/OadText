import { type z } from 'zod';
import { type JoinedChannelResponse, type MessageResponse } from './ServerResponse';
import type SortedWebSocket from './SortedWebSocket';
import { CancellationError, cancelContext } from 'engine/Runtime/cancellation';

type ServerSuccess<T> = {
	success: true;
	player: Readonly<Player>;
	data: T;
};

type ServerError = {
	success: false;
	player: Readonly<Player>;
	/**
	 * Was the error caused by a disconnect?
	 */
	disconnected: boolean;
};

type ServerReturnType<T> = ServerSuccess<T> | ServerError;

type RaceReturnType<T> = ServerSuccess<T> | {
	success: false;
};

export class Player {
	private connected = true;
	constructor(public id: string, public isLocalPlayer: boolean) {}
	isConnected() {
		return this.connected;
	}
	disconnect() {
		this.connected = false;
	}
}

type doForPlayerOptions<T> = {
	schema: z.Schema<T>;
	timeout: number;
	player: Readonly<Player>;
	getValue: (this: {}) => Promise<T>;
	wait?: (this: {}) => Promise<void>;
	signal?: AbortSignal;
};

/**
 * @experimental
 */
export default class Channel {
	private sortedWebSocket: SortedWebSocket;
	private players: Player[];

	private channelId: string;
	private currentRequestId = 0;
	private lastTimestamp: number;
	/**
	 * TODO
	 */
	private locked = true;

	constructor(sortedWebSocket: SortedWebSocket, data: JoinedChannelResponse) {
		this.sortedWebSocket = sortedWebSocket;
		this.players = data.players.map((id) => new Player(id, id === data.player));

		this.channelId = data.channelId;
		this.lastTimestamp = data.timestamp;

		this.sortedWebSocket.eventemitter.on(`channelId:ping`, (e) => {
			this.lastTimestamp = e.timestamp;
		});
		this.unlockForCurrentMicroTask();
	}

	private unlockForCurrentMicroTask() {
		if (!this.locked) {
			// already scheduled
			return;
		}
		this.locked = false;
		setTimeout(() => {
			this.locked = true;
		}, 0);
	}

	public getPlayers(): readonly Readonly<Player>[] {
		return this.players;
	}

	// TODO make private
	// TODO callbacks must be cancellable, make this clear somehow
	public async doForPlayer<T>({
		schema,
		timeout,
		player,
		getValue,
		wait,
		signal,
	}: doForPlayerOptions<T>) {
		if (this.locked) {
			throw new Error('TODO');
		}
		const validUntil = timeout > 0 ? this.lastTimestamp + timeout : Infinity;
		const requestId = this.currentRequestId++;
		const context = {};

		const promise = new Promise<ServerReturnType<T>>(res => {
			// TODO aborting directly like here might lead to infinite loop
			// but we have to if we don't want to talk to the server because
			// of the locking mechanism
			// maybe we should make it an option to timeout instead (or do min/max timeout)
			if (!player.isConnected()) {
				res({
					success: false,
					player,
					disconnected: true,
				});
				return;
			}
			if (signal?.aborted) {
				res({
					success: false,
					player,
					disconnected: false,
				});
				return;
			}

			const onMessage = (e: MessageResponse) => {
				if (e.requestId !== requestId || e.player !== player.id) {
					if (this.lastTimestamp > validUntil) {
						this.sortedWebSocket.eventemitter.off(`channelId`, onMessage);
						this.sortedWebSocket.eventemitter.off(`channelId:disconnected:${player.id}`, onDisconnect);
						signal?.removeEventListener('abort', onAbort);
						cancelContext(context);
						res({
							success: false,
							player,
							disconnected: false,
						});
					}
					// TODO kick player if e.player !== player.id?
					return;
				}

				this.sortedWebSocket.eventemitter.off(`channelId`, onMessage);
				this.sortedWebSocket.eventemitter.off(`channelId:disconnected:${player.id}`, onDisconnect);
				signal?.removeEventListener('abort', onAbort);
				// validate payload
				// ignore disconnected players
				if (player.isConnected() && !schema.safeParse(e.payload).success) {
					player.disconnect();
				}
				if (!player.isConnected()) {
					res({
						success: false,
						player,
						disconnected: true,
					});
					return;
				}
				res({
					success: true,
					player,
					// validated by zod
					data: e.payload as T,
				});
			};

			const onDisconnect = () => {
				this.sortedWebSocket.eventemitter.off(`channelId`, onMessage);
				this.sortedWebSocket.eventemitter.off(`channelId:disconnected:${player.id}`, onDisconnect);
				player.disconnect();
				cancelContext(context);
				res({
					success: false,
					player,
					disconnected: true,
				});
			};

			const onAbort = () => {
				this.sortedWebSocket.eventemitter.off(`channelId`, onMessage);
				this.sortedWebSocket.eventemitter.off(`channelId:disconnected:${player.id}`, onDisconnect);
				signal?.removeEventListener('abort', onAbort);
				cancelContext(context);
				if (signal?.aborted) {
					res({
						success: false,
						player,
						disconnected: false,
					});
					return;
				}
			};
			// TODO we are currently listening to all channel events to implement
			// timeout in an easier way. We should listen to `channelId:${requestId}`
			// again. Also timeouts should probably be ordered by validUntil
			// instead of the call order
			this.sortedWebSocket.eventemitter.on(`channelId`, onMessage);
			this.sortedWebSocket.eventemitter.on(`channelId:disconnected:${player.id}`, onDisconnect);
			signal?.addEventListener('abort', onAbort);
			// TODO handle player disconnected events
		}).then(e => {
			this.unlockForCurrentMicroTask();
			return e;
		});

		if (player.isLocalPlayer) {
			// TODO what if getValue throws
			// TODO validate cancel when cancelled
			getValue.call(context)
				.then(value => {
					if (__DEV__ && !schema.safeParse(value).success) {
						// TODO
						throw new Error('Invalid value');
					}
					this.sortedWebSocket.message(
						this.channelId,
						requestId,
						value,
					);
				})
				// prevent unhandled rejection event
				.catch((e) => {
					if (!(e instanceof CancellationError)) {
						throw e;
					}
				});
		} else {
			if (timeout > 0) {
				// TODO resend, deduplicate calls when multiple requests are active,
				// prevent mutliple players from sending the request at the same time
				setTimeout(() => {
					this.sortedWebSocket.message(
						this.channelId,
						-1,
						null,
					);
				}, timeout);
			}
			wait?.call(context)
				// prevent unhandled rejection event
				.catch((e) => {
					if (!(e instanceof CancellationError)) {
						throw e;
					}
				});
		}
		return await promise;
	}

	public race() {
		return new Channel.RaceBuilder(this);
	}

	private static RaceBuilder = class<T = never> {
		private controller = new AbortController();
		private availablePlayers: Readonly<Player>[];
		private options: doForPlayerOptions<T>[] = [];

		constructor(private channel: Channel) {
			this.availablePlayers = channel.getPlayers().slice();
		}

		public do<U>(options: Omit<doForPlayerOptions<U>, 'timeout' | 'signal'>) {
			const player = options.player;
			if (!this.availablePlayers.includes(player)) {
				throw new Error('Player is not available');
			}
			this.availablePlayers = this.availablePlayers.filter((p) => p !== player);
			const builder = this as InstanceType<typeof Channel.RaceBuilder<T | U>>;

			builder.options.push({
				...options,
				timeout: -1,
				signal: this.controller.signal,
			});
			return builder;
		}

		public orElse<U>(options: Omit<doForPlayerOptions<U>, 'player' | 'timeout' | 'signal'>) {
			const builder = this as InstanceType<typeof Channel.RaceBuilder<T | U>>;
			this.availablePlayers.forEach((player) => {
				builder.do({
					player,
					...options,
				});
			});
			return builder.getPromise();
		}

		public orElseWait(timeout: number) {
			this.options = this.options.map((option) => ({
				...option,
				timeout,
			}));

			return this.getPromise();
		}

		public end() {
			if (this.availablePlayers.some(p => p.isConnected)) {
				throw new Error('Not all connected players have been handled');
			}
			return this.getPromise();
		}

		public getPromise() {
			let remainingPromises = this.options.length;
			return new Promise<RaceReturnType<T>>(async (res) => {
				this.options.forEach(async (option) => {
					const response = await this.channel.doForPlayer(option);

					if (response.success) {
						res(response);
						this.controller.abort();
					} else {
						remainingPromises--;
						if (remainingPromises === 0) {
							res({
								success: false,
							});
							this.controller.abort();
						}
					}
				});
			});
		}
	};

	public all() {
		return new Channel.AllBuilder(this);
	}

	private static AllBuilder = class<T extends any[] = []> {
		private availablePlayers: Readonly<Player>[];
		private options: doForPlayerOptions<any>[] = []; // TODO type

		constructor(private channel: Channel) {
			this.availablePlayers = channel.getPlayers().slice();
		}

		// TODO add fallback option?
		public do<U>(options: Omit<doForPlayerOptions<U>, 'timeout' | 'signal'>) {
			const player = options.player;
			if (!this.availablePlayers.includes(player)) {
				throw new Error('Player is not available');
			}
			this.availablePlayers = this.availablePlayers.filter((p) => p !== player);
			const builder = this as unknown as InstanceType<typeof Channel.AllBuilder<[...T, U]>>;

			builder.options.push({
				...options,
				timeout: -1,
			});
			return builder;
		}

		public orElse<U>(options: Omit<doForPlayerOptions<U>, 'player' | 'timeout' | 'signal'>, timeout: number) {
			const builder = this as unknown as InstanceType<typeof Channel.AllBuilder<[...T, ...U[]]>>;
			this.availablePlayers.forEach((player) => {
				builder.do({
					player,
					...options,
				});
			});
			this.options = this.options.map((option) => ({
				...option,
				timeout,
			}));
			return builder.getPromise();
		}

		public orElseWait(timeout: number) {
			this.options = this.options.map((option) => ({
				...option,
				timeout,
			}));

			return this.getPromise();
		}

		public end(timeout: number) {
			if (this.availablePlayers.some(p => p.isConnected)) {
				throw new Error('Not all connected players have been handled');
			}
			this.options = this.options.map((option) => ({
				...option,
				timeout,
			}));
			return this.getPromise();
		}

		public getPromise() {
			// TODO generic solution
			type Mapped<T extends any[]> = T extends [infer U, ...infer V] ? [ServerReturnType<U>, ...Mapped<V>]
				: T extends (infer U)[] ? (U extends never ? []
						: ServerReturnType<U>[])
				: [];

			return Promise.all(this.options.map((option) => this.channel.doForPlayer(option))) as Promise<Mapped<T>>;
		}
	};
}
