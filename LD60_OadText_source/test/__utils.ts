import { expect, type MockInstance } from 'vitest';

function promiseWithResolvers() {
	let resolve, reject;
	const promise = new Promise((res, rej) => {
		resolve = res;
		reject = rej;
	});
	return {
		promise,
		resolve,
		reject,
	};
}

export function mockPromise<T = void>(): Promise<T> & { resolve(value: T): void; reject(reason?: any): void } {
	const { promise, resolve, reject } = promiseWithResolvers() as any;

	promise.resolve = resolve;
	promise.reject = reject;

	return promise;
}

export function expectCallOrder(...args: MockInstance[]) {
	for (let i = 0; i < args.length - 1; i++) {
		expect(args[i]).toHaveBeenCalledBefore(args[i + 1]);
	}
}
