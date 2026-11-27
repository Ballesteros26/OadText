import { type JoinedChannelResponse } from './ServerResponse';
import SortedWebSocket from './SortedWebSocket';
import Channel from './Channel';

/**
 * @experimental
 */
export class Pond {
	private sortedWebSocket: SortedWebSocket;

	constructor(url: string) {
		this.sortedWebSocket = new SortedWebSocket(url);
	}

	public async joinChannel(lobbyId: string) {
		await this.sortedWebSocket.promise;
		this.sortedWebSocket.join(lobbyId);

		return await new Promise<Channel>((res) => {
			this.sortedWebSocket.eventemitter.once(`${lobbyId}:joined`, (response) => {
				res(new Channel(
					this.sortedWebSocket,
					response as JoinedChannelResponse,
				));
			});
		});
	}
}
