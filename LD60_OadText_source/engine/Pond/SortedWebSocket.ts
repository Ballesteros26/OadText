import EventEmitter from 'eventemitter3';
import type {
	JoinedChannelResponse,
	MessageResponse,
	PlayerDisconnectedNotification,
	ServerResponse,
} from './ServerResponse';

/**
 * Thin layer around WebSocket to abstract away the API and ensure that messages
 * are received in the correct order.
 *
 * @experimental
 */
export default class SortedWebSocket {
	private socket: WebSocket;
	public readonly promise: Promise<void>;
	public readonly eventemitter: EventEmitter<
		& {
			[P in `${string}:joined`]: (response: JoinedChannelResponse) => void;
		}
		& {
			[P in `channelId:${number}`]: (response: MessageResponse) => void;
		}
		& {
			[P in `channelId`]: (response: MessageResponse) => void;
		}
		& {
			[P in `channelId:ping`]: (response: { timestamp: number }) => void;
		}
		& {
			[P in `channelId:disconnected:${string}`]: (response: PlayerDisconnectedNotification) => void;
		}
	>;

	// TODO initialize based on join event and handle per channel
	private currentMsgCount = 0;
	private queue: ServerResponse[] = [];

	constructor(url: string) {
		this.socket = new WebSocket(url);

		this.promise = this.getPromise();
		this.eventemitter = new EventEmitter();
		this.init();
	}

	private getPromise() {
		return new Promise<void>((resolve, reject) => {
			this.socket.addEventListener('open', () => resolve(), { once: true });
			this.socket.addEventListener('error', reject, { once: true });
		});
	}

	private init() {
		this.socket.addEventListener('message', (event: MessageEvent<string>) => {
			const data = JSON.parse(event.data) as ServerResponse; // TODO handle error
			if (data.msgCount === this.currentMsgCount) {
				this.emitResponse(data);
			} else {
				this.queue.push(data);
				this.queue.sort((a, b) => a.msgCount - b.msgCount);
			}
		});
	}

	private checkQueue() {
		if (this.queue[0]?.msgCount === this.currentMsgCount) {
			const data = this.queue.shift()!;
			// execute on next macro task to ensure micro tasks got executed
			setTimeout(() => {
				this.emitResponse(data);
			}, 0);
		}
	}

	private emitResponse(response: ServerResponse) {
		this.currentMsgCount++;

		// TODO When no listener: based on the locking mechanism the player >>ACTUALLY SENDING<< this message must be cheating
		// OR the request got already resolved and the player is good acting. Just check if requestId < lastRequestId
		// and requestId > 0
		if (response.type === 'joinedChannel') {
			this.eventemitter.emit(`${response.lobbyId}:joined`, response);
		} else if (response.type === 'message') {
			this.eventemitter.emit(`channelId:ping`, response);
			this.eventemitter.emit(`channelId:${response.requestId}`, response);
			// TODO implement timeout better
			this.eventemitter.emit(`channelId`, response);
		} else if (response.type === 'playerDisconnected') {
			this.eventemitter.emit(`channelId:ping`, response);
			this.eventemitter.emit(`channelId:disconnected:${response.player}`, response);
		}
		this.checkQueue();
	}

	private send(data: any) {
		this.socket.send(JSON.stringify(data));
	}

	public join(lobbyId: string) {
		this.send({
			action: 'join',
			lobbyId,
		});
	}

	public message(channelId: string, requestId: number, payload: any) {
		this.send({
			action: 'message',
			channelId,
			requestId,
			payload,
		});
	}
}
