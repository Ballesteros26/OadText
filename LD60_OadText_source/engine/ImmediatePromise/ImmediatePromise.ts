// derived from https://github.com/paldepind/sync-promise

const enum State {
	PENDING = 2,
	FULFILLED = 0,
	REJECTED = 1,
	CANCELLED = 3,
}

function isPromiseLike(value: any): value is PromiseLike<any> {
	return value && typeof value.then === 'function';
}

function removeFromArray<T>(array: T[], value: T) {
	const index = array.indexOf(value);
	if (index > -1) {
		array.splice(index, 1);
	}
}

export default class ImmediatePromise<out T> implements PromiseLike<T> {
	// keep value and reason for better debugging
	private value: T | undefined = undefined;
	private reason: any = undefined;

	private isConstructed = false;
	private state = State.PENDING;
	private callbacks: [
		((value: any) => void)[],
		((reason: any) => void)[],
	] | null = [[], []];
	private promise: Promise<T> | null;
	private ordinaryPromiseExposed = false;
	private resPromise?: (value: any) => void;
	private rejPromise?: (reason?: any) => void;
	private cleanupCb?: () => void;

	private listenerCount = 0;

	constructor(executor: (
		resolve: (value: T | PromiseLike<T>) => void,
		reject: (reason?: any) => void,
		onCleanup: (cb: () => void) => void,
	) => void) {
		this.promise = new Promise<T>((res, rej) => {
			this.resPromise = res;
			this.rejPromise = rej;
		});
		const resolve = (value: T | PromiseLike<T>) => {
			if (this.callbacks == null) {
				return;
			}
			if (isPromiseLike(value)) {
				value.then(resolve, reject);
			} else {
				this.settle(value, State.FULFILLED);
			}
		};
		const reject = (reason?: any) => {
			if (this.callbacks == null) {
				return;
			}
			this.settle(reason, State.REJECTED);
		};
		executor(resolve, reject, cb => this.cleanupCb = cb);
		this.isConstructed = true;
	}

	private settle(...[value, state]: [T, State.FULFILLED] | [any, State.REJECTED]) {
		if (!this.isConstructed) {
			throw new Error('Cannot settle `ImmediatePromise` while initializing');
		}
		this.state = state;
		if (state === State.FULFILLED) {
			this.value = value;
			this.resPromise!(value);
		} else {
			if (this.callbacks![State.REJECTED].length > 0 && !this.ordinaryPromiseExposed) {
				this.promise!.catch(() => null);
			}
			this.reason = value;
			this.rejPromise!(value);
		}
		this.callbacks![state].forEach((fn) => fn(value));

		this.destroy();
	}

	private destroy() {
		this.promise = null;
		this.resPromise = undefined;
		this.rejPromise = undefined;
		this.callbacks = null;

		this.cleanupCb?.();
		this.cleanupCb = undefined;
	}

	then<TResult1 = T, TResult2 = never>(
		onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null,
		onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null,
	): ImmediatePromise<TResult1 | TResult2> {
		if (this.state !== State.PENDING) {
			throw new Error('Cannot attach onto an resolved `ImmediatePromise`.');
		}
		this.listenerCount++;
		return new ImmediatePromise((res, rej, onCleanup) => {
			const fullfill = value => {
				try {
					res(onfulfilled?.(value) ?? value as TResult1);
				} catch (e) {
					rej(e);
				}
			};
			this.callbacks![State.FULFILLED].push(fullfill);

			const reject = onrejected
				? reason => {
					try {
						res(onrejected(reason));
					} catch (e) {
						rej(e);
					}
				}
				: rej;
			this.callbacks![State.REJECTED].push(reject);

			onCleanup(() => {
				if (this.callbacks) {
					removeFromArray(this.callbacks[State.FULFILLED], fullfill);
					removeFromArray(this.callbacks[State.REJECTED], reject);
				}

				this.listenerCount--;
				if (this.listenerCount === 0) {
					this.cancel();
				}
			});
		});
	}

	catch<
		TResult = never,
	>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): ImmediatePromise<
		T | TResult
	> {
		return this.then(null, onrejected);
	}

	finally(onfinally?: (() => void) | undefined | null): ImmediatePromise<T> {
		return this.then(
			(value) => {
				onfinally?.();
				return value;
			},
			(reason) => {
				onfinally?.();
				throw reason;
			},
		);
	}

	cancel() {
		if (this.state !== State.PENDING) {
			return;
		}
		this.state = State.CANCELLED;
		this.destroy();
	}

	getOrdinaryPromise(signal: AbortSignal | null) {
		if (!this.callbacks) {
			throw new Error('Cannot attach onto an resolved `ImmediatePromise`.');
		}
		if (signal?.aborted) {
			throw new Error('Signal is already aborted.');
		}
		this.ordinaryPromiseExposed = true;
		this.listenerCount++;
		if (signal) {
			const callback = () => {
				this.listenerCount--;
				if (this.listenerCount === 0) {
					this.cancel();
				}
			};
			signal.addEventListener('abort', callback, { once: true });
			const removeCallback = () => signal.removeEventListener('abort', callback);
			this.callbacks[State.FULFILLED].push(removeCallback);
			this.callbacks[State.REJECTED].push(removeCallback);
		}
		return this.promise!;
	}

	[Symbol.toStringTag] = 'ImmediatePromise';

	static all<T extends readonly unknown[] | []>(values: T): ImmediatePromise<{
		-readonly [P in keyof T]: Awaited<T[P]>;
	}> {
		return new ImmediatePromise((resolve, rej, onCleanup) => {
			if (values.length === 0) {
				Promise.resolve()
					.then(() =>
						resolve([] as {
							-readonly [P in keyof T]: Awaited<T[P]>;
						})
					);
				return;
			}
			const cancellables: ImmediatePromise<void>[] = [];
			let unsettledPromisesCount = values.length;
			const resolved = new Array<any>(unsettledPromisesCount);
			const res = (val: unknown, i: number) => {
				resolved[i] = val;
				unsettledPromisesCount--;
				if (unsettledPromisesCount === 0) {
					Promise.resolve()
						.then(() =>
							resolve(resolved as {
								-readonly [P in keyof T]: Awaited<T[P]>;
							})
						);
				}
			};
			(values as (PromiseLike<Awaited<T[number]>> | Awaited<T[number]>)[])
				.forEach((p, i) => {
					if (p instanceof ImmediatePromise) {
						cancellables.push(p.then((val) => res(val, i), rej));
					} else {
						Promise.resolve(p)
							.then((val) => res(val, i), rej);
					}
				});
			onCleanup(() => {
				cancellables.forEach(c => c.cancel());
			});
		});
	}

	static allSettled<T extends readonly unknown[] | []>(values: T): ImmediatePromise<{
		-readonly [P in keyof T]: PromiseSettledResult<Awaited<T[P]>>;
	}> {
		return new ImmediatePromise((resolve, rej, onCleanup) => {
			if (values.length === 0) {
				Promise.resolve()
					.then(() =>
						resolve([] as {
							-readonly [P in keyof T]: PromiseSettledResult<Awaited<T[P]>>;
						})
					);
				return;
			}
			const cancellables: ImmediatePromise<void>[] = [];
			let unsettledPromisesCount = values.length;
			const settled = new Array<PromiseSettledResult<any>>(unsettledPromisesCount);
			const res = (set: PromiseSettledResult<unknown>, i: number) => {
				settled[i] = set;
				unsettledPromisesCount--;
				if (unsettledPromisesCount === 0) {
					Promise.resolve()
						.then(() =>
							resolve(settled as {
								-readonly [P in keyof T]: PromiseSettledResult<Awaited<T[P]>>;
							})
						);
				}
			};
			(values as (PromiseLike<Awaited<T[number]>> | Awaited<T[number]>)[])
				.forEach((p, i) => {
					if (p instanceof ImmediatePromise) {
						cancellables.push(p
							.then((val) =>
								res({
									status: 'fulfilled',
									value: val,
								}, i)
							)
							.catch((err) =>
								res({
									status: 'rejected',
									reason: err,
								}, i)
							));
					} else {
						Promise.resolve(p)
							.then((val) =>
								res({
									status: 'fulfilled',
									value: val,
								}, i)
							)
							.catch((err) =>
								res({
									status: 'rejected',
									reason: err,
								}, i)
							);
					}
				});
			onCleanup(() => {
				cancellables.forEach(c => c.cancel());
			});
		});
	}

	static race<T extends readonly unknown[] | []>(values: T): ImmediatePromise<Awaited<T[number]>> {
		return new ImmediatePromise((res, rej, onCleanup) => {
			const cancellables: ImmediatePromise<void>[] = [];
			(values as (PromiseLike<Awaited<T[number]>> | Awaited<T[number]>)[])
				.forEach((p) => {
					if (p instanceof ImmediatePromise) {
						cancellables.push(p.then(res, rej));
					} else {
						Promise.resolve(p)
							.then(res, rej);
					}
				});
			onCleanup(() => {
				cancellables.forEach(c => c.cancel());
			});
		});
	}

	static any<T extends readonly unknown[] | []>(values: T): ImmediatePromise<Awaited<T[number]>> {
		if (values.length === 0) {
			throw new Error('Provided an empty array to ImmediatePromise.any');
		}
		return new ImmediatePromise((res, reject, onCleanup) => {
			const cancellables: ImmediatePromise<void>[] = [];
			let unsettledPromisesCount = values.length;
			const errors = new Array<unknown>(unsettledPromisesCount);
			const rej = (err: unknown, i: number) => {
				errors[i] = err;
				unsettledPromisesCount--;
				if (unsettledPromisesCount === 0) {
					Promise.resolve()
						.then(() =>
							reject(new AggregateError(
								errors,
								'No Promise in ImmediatePromise.any was resolved',
							))
						);
				}
			};
			(values as (PromiseLike<Awaited<T[number]>> | Awaited<T[number]>)[])
				.forEach((p, i) => {
					if (p instanceof ImmediatePromise) {
						cancellables.push(p.then(res, (err) => rej(err, i)));
					} else {
						Promise.resolve(p)
							.then(res, (err) => rej(err, i));
					}
				});
			onCleanup(() => {
				cancellables.forEach(c => c.cancel());
			});
		});
	}
}
