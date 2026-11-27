import z from 'zod';

export const RemotePayloadSchema = z.union([
	z.literal('red-buttons'),
	z.literal('blue-buttons'),
	z.literal('crazy-toad'),
]);
export type RemotePayload = z.infer<typeof RemotePayloadSchema>;
