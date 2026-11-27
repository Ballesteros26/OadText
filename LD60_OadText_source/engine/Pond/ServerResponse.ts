export type JoinedChannelResponse = {
	type: 'joinedChannel';
	channelId: string;
	msgCount: number;
	player: string;
	players: string[];
	lobbyId: number;
	timestamp: number;
};

export type MessageResponse = {
	type: 'message';
	player: string;
	msgCount: number;
	requestId: number;
	payload: unknown;
	timestamp: number;
};

// TODO this might be sent multiple times
export type PlayerDisconnectedNotification = {
	type: 'playerDisconnected';
	channelId: string;
	msgCount: number;
	player: string;
	timestamp: number;
};

export type ServerResponse = JoinedChannelResponse | MessageResponse | PlayerDisconnectedNotification;
