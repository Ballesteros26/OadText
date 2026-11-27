import { randomBytes, hash } from 'node:crypto';

const HASH_LENGTH = 8;

export function getRandomHash() {
	return randomBytes(HASH_LENGTH / 2).toString('hex');
}

export function getHash(data: string | NodeJS.ArrayBufferView) {
	return hash('sha256', data, 'hex')
		.substring(0, HASH_LENGTH);
}
