import { z } from 'zod';
import type Channel from '../Channel';
import { type Player } from '../Channel';

const RTCConfiguration = {
	iceServers: [{
		urls: 'stun:stun.l.google.com:19302',
	}],
};

const ONCE = { once: true };

const RTCSessionDescriptionSchema = z.object({
	sdp: z.string(),
	type: z.enum(['answer', 'offer', 'pranswer', 'rollback']),
});

// TODO use dedicated channel as only 2 players participate here
// TODO some mechanism to help ensure that both sides have listeners set up before
// messages are send (currently user has to use channel.all())
/**
 * @experimental
 */
export async function createPeer2PeerConnection(
	playerA: Readonly<Player>,
	playerB: Readonly<Player>,
	channel: Channel,
) {
	const peerConnection = new RTCPeerConnection(RTCConfiguration);

	const localChannelPromise = new Promise<RTCDataChannel>((res, rej) => {
		const localChannel = peerConnection.createDataChannel('channel');
		localChannel.addEventListener('open', () => {
			res(localChannel);
		}, ONCE);
		localChannel.addEventListener('close', () => {
			console.warn('local channel has closed');
			rej(new Error('local channel has closed'));
		}, ONCE);
	});

	const remoteChannelPromise = new Promise<RTCDataChannel>((res, rej) => {
		peerConnection.addEventListener('datachannel', (event) => {
			const remoteChannel = event.channel;
			remoteChannel.addEventListener('open', () => {
				res(remoteChannel);
			}, ONCE);
			remoteChannel.addEventListener('close', () => {
				console.warn('remoteChannel channel has closed');
				rej(new Error('remoteChannel channel has closed'));
			}, ONCE);
		}, ONCE);
	});

	const offerResponse = await channel.race()
		.do({
			player: playerA,
			schema: RTCSessionDescriptionSchema,
			async getValue() {
				peerConnection.onnegotiationneeded = event => {
					peerConnection.createOffer()
						.then(description => peerConnection.setLocalDescription(description))
						.catch(e => console.error(e));
				};
				const offer = await new Promise<z.infer<typeof RTCSessionDescriptionSchema>>((resolve) => {
					peerConnection.onicecandidate = event => {
						if (event.candidate === null) {
							resolve(peerConnection.localDescription!);
						}
					};
				});
				return offer;
			},
		})
		.orElseWait(10000);

	if (!offerResponse.success) {
		return {
			success: false,
			player: playerA,
			disconnected: false,
		} as const;
	}
	const offerDescription = offerResponse.data;

	const answerResponse = await channel.race()
		.do({
			player: playerB,
			schema: RTCSessionDescriptionSchema.nullable(),
			async getValue() {
				try {
					const description = new RTCSessionDescription(offerDescription);
					await peerConnection.setRemoteDescription(description);
					const answer = await peerConnection.createAnswer();
					await peerConnection.setLocalDescription(answer);
					return peerConnection.localDescription;
				} catch (error) {
					// TODO
					return null;
				}
			},
		})
		.orElseWait(3000);

	if (!answerResponse.success || answerResponse.data == null) {
		return {
			success: false,
			player: playerB,
			disconnected: false,
		} as const;
	}
	const answerDescription = answerResponse.data;

	await channel.race()
		.do({
			player: playerA,
			schema: z.null(),
			async getValue() {
				try {
					await peerConnection.setRemoteDescription(new RTCSessionDescription(answerDescription));
					return null;
				} catch (error) {
					// TODO
					return null;
				}
			},
		})
		.orElseWait(1000);

	await channel.all()
		.do({
			player: playerA,
			schema: z.null(),
			async getValue() {
				await Promise.all([
					localChannelPromise,
					remoteChannelPromise,
				]);
				return null;
			},
		})
		.do({
			player: playerB,
			schema: z.null(),
			async getValue() {
				await Promise.all([
					localChannelPromise,
					remoteChannelPromise,
				]);
				return null;
			},
		})
		.orElseWait(2000);

	return {
		success: true,
		data: await Promise.all(playerA.isLocalPlayer
			? [localChannelPromise, remoteChannelPromise]
			: playerB.isLocalPlayer
			? [remoteChannelPromise, localChannelPromise]
			: [null, null]),
	} as const;
}
