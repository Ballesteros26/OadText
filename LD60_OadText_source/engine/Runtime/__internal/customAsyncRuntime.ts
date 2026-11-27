import { getCancellationSignal } from '../cancellation';
import ImmediatePromise from 'engine/ImmediatePromise/ImmediatePromise';

type StagedCallbacks = readonly [() => void, () => void, () => void];
const listenerMap = new WeakMap<AbortSignal, () => void>();
const callbackMap = new WeakMap<AbortSignal, StagedCallbacks[]>();

/**
 * Note: Only call this function if you are sure that the signal is not aborted
 * yet to not mutate the callback list while iterating over it.
 */
function addStagedCallbacks(
	signal: AbortSignal | undefined,
	callbacks: StagedCallbacks,
) {
	if (!signal) {
		return;
	}
	// register abort listener if not already done
	if (!callbackMap.has(signal)) {
		callbackMap.set(signal, []);

		const listener = () => {
			const cbs = callbackMap.get(signal)!;

			for (const stage of [0, 1, 2]) {
				cbs.forEach(listener => listener[stage]());
			}
		};
		listenerMap.set(signal, listener);
		signal.addEventListener('abort', listener, { once: true });
	}

	callbackMap.get(signal)!.push(callbacks);
}

/**
 * Note: Only call this function if you are sure that the signal is not aborted
 * yet to not mutate the callback list while iterating over it.
 */
function removeStagedCallbacks(
	signal: AbortSignal | undefined,
	callback: StagedCallbacks,
) {
	if (!signal) {
		return;
	}

	const callbacks = callbackMap.get(signal)!;
	const index = callbacks.indexOf(callback);
	if (index !== -1) {
		callbacks.splice(index, 1);
	}
	if (callbacks.length === 0) {
		signal.removeEventListener('abort', listenerMap.get(signal)!);
		listenerMap.delete(signal);
		callbackMap.delete(signal);
	}
}

/**
 * Because of the transformer, calling .return() on a generator function
 * from an async function is a noop when the function is suspended in a finally
 * block (this is by design).
 *
 * To be able to correctly detect this case and distinguish it from awaiting
 * the same Promise twice, the generator will return this token in that case.
 *
 * Note: This is a promise to avoid deoptimization (but I don't know if it
 * actually helps)
 */
export const continueWithLastYieldToken = new Promise(() => {});

type Locker = {
	readonly lock: () => void;
	readonly unlock: () => void;
};

/**
 * Prevents `.return()` from stopping the wrapped generator function while the
 * given locker is locked.
 *
 * Note: After the locker gets unlocked, `continueWithLastYieldToken` must be
 * yielded to call `.return()` on the wrapped generator function if it was
 * called while the locker was locked.
 *
 * @param generator A function receiving a locker object and returning a
 * generator function
 * @param that The context to call the generator function with
 * @returns A generator fulfilling the described behavior
 */
export function* lockReturnCalls<T, TNext>(
	generator: (locker: Locker) => () => Generator<T, void, TNext>,
	that: any,
) {
	let locked = false;
	const locker = {
		lock() {
			locked = true;
		},
		unlock() {
			locked = false;
		},
	};

	const gen = generator(locker).call(that);

	let wasReturned = true;
	let yielded: IteratorResult<T, void>;
	try {
		yielded = gen.next();
		while (!yielded.done) {
			if (yielded.value === continueWithLastYieldToken) {
				yielded = gen.next();
				continue;
			}
			try {
				// if error is thrown by .next(), .throw() will rethrow it
				yielded = gen.next(yield yielded.value);
			} catch (e) {
				yielded = gen.throw(e);
			}
		}
		return yielded.value;
	} catch (e) {
		wasReturned = false;
		throw e;
	} finally {
		if (wasReturned) {
			let returnCalled = !locked;
			if (returnCalled) {
				yielded = gen.return();
			} else {
				try {
					// if error is thrown by .next(), .throw() will rethrow it
					yielded = gen.next(yield continueWithLastYieldToken);
				} catch (e) {
					yielded = gen.throw(e);
				}
			}

			while (!yielded.done) {
				if (yielded.value === continueWithLastYieldToken) {
					yielded = returnCalled
						? gen.next()
						: gen.return();
					returnCalled = true;
					continue;
				}

				try {
					// if error is thrown by .next(), .throw() will rethrow it
					yielded = gen.next(yield yielded.value);
				} catch (e) {
					yielded = gen.throw(e);
				}
			}
			// do not return inside of finally!
		}
	}
}

// @formatter-ignore
/**
 * Generated polyfill from TypeScript for for-await-of loops when targeting ES2017.
 */
export function asyncValues(o: any): AsyncIterableIterator<any> {
	let m = o[Symbol.asyncIterator], i;
	return m ? m.call(o) : (o = o[Symbol.iterator](), i = {}, verb('next'), verb('throw'), verb('return'), i[Symbol.asyncIterator] = function () { return this; }, i);
	function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
	function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
}

export default function runAsync<T>(
	fn: () => Generator<unknown, T | PromiseLike<T> | ImmediatePromise<T>, any>,
	that: any,
): Promise<Awaited<T>> {
	const signal = getCancellationSignal(that);
	if (signal?.aborted) {
		return Promise.reject(signal.reason);
	}

	const gen = fn.call(that) as Generator<unknown, T | PromiseLike<Awaited<T>> | ImmediatePromise<Awaited<T>>, any>;

	// when calling .return(), await statements could be skipped and have to be ignored
	let awaitingId = 0;
	let awaitingPromise: Promise<unknown> | null = null;
	let shouldCallReturn = false;

	const promise = new Promise((res, rej) => {
		const callbacks = [
			() => {
				// ignore settling ImmediatePromises before calling return
				// run this before .step() calls can produce side effects
				shouldCallReturn = true;
			},
			() => {
				if (awaitingPromise instanceof ImmediatePromise) {
					awaitingPromise.cancel();
				}
				awaitingPromise = null;
			},
			() => {
				if (shouldCallReturn) {
					shouldCallReturn = false;
					step(undefined, false, true);
				}
				// prevent unhandled rejection event
				promise.catch(() => {});
				rej(signal!.reason);
			},
		] as const;
		addStagedCallbacks(signal, callbacks);

		const step = (v: unknown, rejected: boolean, returning = false) => {
			awaitingId++;
			try {
				const { done, value } = returning
					? gen.return(v as any)
					: rejected
					? gen.throw(v)
					: gen.next(v);

				if (value === continueWithLastYieldToken) {
					// await last yield again
					awaitingId--;
					return;
				}

				if (done) {
					if (!signal?.aborted) {
						removeStagedCallbacks(signal, callbacks);
						res(value instanceof ImmediatePromise
							? value.getOrdinaryPromise(null)
							: value as Awaited<T> | PromiseLike<Awaited<T>>);
					}
				} else {
					const id = awaitingId;
					const promise = value instanceof ImmediatePromise
						? value
						: Promise.resolve(value);
					// eslint-disable-next-line quack-engine/handle-immediate-promise-synchronously
					awaitingPromise = promise.then(
						v => {
							// this can only happen if a ImmediatePromise got
							// settled as side effect of calling .return()
							// on another generator
							if (shouldCallReturn) {
								shouldCallReturn = false;
								// inceases awaitingId if .return() does not
								// yield continueWithLastYieldToken
								step(undefined as any, false, true);
							}
							if (awaitingId === id) step(v, false);
						},
						v => {
							// this can only happen if a ImmediatePromise got
							// settled as side effect of calling .return()
							// on another generator
							if (shouldCallReturn) {
								shouldCallReturn = false;
								// inceases awaitingId if .return() does not
								// yield continueWithLastYieldToken
								step(undefined as any, false, true);
							}
							if (awaitingId === id) step(v, true);
						},
					);
				}
			} catch (e) {
				if (!signal?.aborted) {
					removeStagedCallbacks(signal, callbacks);
					rej(e);
				} else {
					console.warn('Suppressed Error in finally block of cancelled async function', e);
				}
			}
		};

		step(undefined, false);
	});

	return promise as Promise<Awaited<T>>;
}
