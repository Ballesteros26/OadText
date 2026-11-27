import { describe, it, assert, vi, expect, beforeAll, afterAll } from 'vitest';

import ImmediatePromise from 'engine/ImmediatePromise/ImmediatePromise';
import { bindPromiseRejectionEventsHandler } from '../__polyfills/promiseRejectionEvents';

function isImmediatePromiseSettled(promise: ImmediatePromise<unknown>) {
	// warning: it is easy to mess up when inlining
	try {
		promise.then(() => {});
		return false;
	} catch (e) {
		return e?.message === 'Cannot attach onto an resolved `ImmediatePromise`.';
	}
}

const originalConsoleError = console.error;

describe('ImmediatePromise', () => {
	// Vitest's browser runner logs `unhandledrejection` events via
	// `console.error(event)`, preventing browsers from dispatching
	// `rejectionhandled`
	beforeAll(() => {
		function consoleErrorWithoutRejectionEvents(...args: unknown[]) {
			originalConsoleError(...args.map(arg => arg instanceof PromiseRejectionEvent ? arg.reason : arg));
		}
		console.error = consoleErrorWithoutRejectionEvents;
	});
	afterAll(() => {
		console.error = originalConsoleError;
	});

	describe('constructor works', () => {
		it('flattens resolved promise likes', () => {
			let resolve, res;
			const callback = vi.fn();
			new ImmediatePromise((res) => {
				resolve = res;
			}).then(callback);
			const promise = new ImmediatePromise((r) => {
				res = r;
			});
			resolve(promise);
			res(2);
			expect(callback).toHaveBeenCalledWith(2);
		});

		it('flattens resolved deep promise likes', () => {
			let resolve, res1, res2;
			const callback = vi.fn();
			const promise1 = new ImmediatePromise((res) => {
				res1 = res;
			});
			const promise2 = new ImmediatePromise((res) => {
				res2 = res;
			});
			new ImmediatePromise((res) => {
				resolve = res;
			}).then(callback);
			resolve(promise1);
			res1(promise2);
			res2(2);
			expect(callback).toHaveBeenCalledWith(2);
		});

		it('throws if fulfilled synchronously', () => {
			assert.throws(() => {
				new ImmediatePromise((res) => {
					res(1);
				});
			});
		});

		it('throws if rejected synchronously', () => {
			assert.throws(() => {
				new ImmediatePromise((_, rej) => {
					rej(1);
				});
			});
		});

		// NOTE: Intentional divergence from Promise
		it('throws if callback throws', () => {
			const error = new Error();
			assert.throws(() => {
				new ImmediatePromise(() => {
					throw error;
				});
			}, error);
		});
	});

	describe('`.then` works', () => {
		describe('callback handling', () => {
			it('callback gets called immediately on fulfilled promise', () => {
				const callback = vi.fn();
				let resolve;
				new ImmediatePromise((res) => {
					resolve = res;
				}).then(callback);
				resolve(2);
				expect(callback).toHaveBeenCalledWith(2);
			});

			it('recieves fulfilled value', () => {
				const callback = vi.fn();
				let resolve;
				new ImmediatePromise((res) => {
					resolve = res;
				}).then(callback);
				resolve(1);
				expect(callback).toHaveBeenCalledWith(1);
			});

			it('gets ignored on rejected promise', async () => {
				// eslint-disable-next-line @typescript-eslint/no-unused-vars
				using unhandledrejection = bindPromiseRejectionEventsHandler('unhandledrejection', vi.fn());

				let reject;
				new ImmediatePromise((_, rej) => {
					reject = rej;
				}).then(() => {
					assert.fail('`.then` callback called');
				});
				reject(new Error('TestError'));
				await new Promise(r => setTimeout(r, 1)); // 0 does not work in Firefox
			});
		});

		describe('derived promise', () => {
			it('returns promise with same value if callback is empty', () => {
				const callback = vi.fn();
				let resolve;
				new ImmediatePromise((res) => {
					resolve = res;
				}).then().then(callback);
				resolve(1);
				expect(callback).toHaveBeenCalledWith(1);
			});

			it('returns promise with returned value', () => {
				const callback = vi.fn();
				let resolve;
				new ImmediatePromise((res) => {
					resolve = res;
				}).then(() => {
					return 2;
				}).then(callback);
				resolve(1);
				expect(callback).toHaveBeenCalledWith(2);
			});

			it('flattens returned promise likes', () => {
				const callback = vi.fn();
				let resolve, res;
				new ImmediatePromise((res) => {
					resolve = res;
				}).then(() => {
					const promise = new ImmediatePromise((r) => {
						res = r;
					});
					return promise;
				}).then(callback);
				resolve(1);
				res(2);
				expect(callback).toHaveBeenCalledWith(2);
			});

			it('flattens returned deep promise likes', () => {
				const callback = vi.fn();
				let resolve, res1, res2;
				const promise1 = new ImmediatePromise((res) => {
					res1 = res;
				});
				const promise2 = new ImmediatePromise((res) => {
					res2 = res;
				});
				new ImmediatePromise((res) => {
					resolve = res;
				}).then(() => {
					return promise1;
				}).then(callback);
				resolve(1);
				res1(promise2);
				res2(2);
				expect(callback).toHaveBeenCalledWith(2);
			});

			it('returns rejected promise if error is thrown', () => {
				const callback = vi.fn();
				let resolve;
				new ImmediatePromise((res) => {
					resolve = res;
				}).then(() => {
					throw 2;
				}).catch(callback);
				resolve(1);
				expect(callback).toHaveBeenCalledWith(2);
			});

			it('returns rejected promise if ancestor is rejected', () => {
				const callback = vi.fn();
				let reject;
				new ImmediatePromise((_, rej) => {
					reject = rej;
				}).then(() => {
					return 2;
				}).catch(callback);
				reject(1);
				expect(callback).toHaveBeenCalledWith(1);
			});
		});
	});

	describe('`.catch` works', () => {
		describe('callback handling', () => {
			it('callback gets called immediately on rejected promise', () => {
				const callback = vi.fn();
				let reject;
				new ImmediatePromise((_, rej) => {
					reject = rej;
				}).catch(callback);
				reject(2);
				expect(callback).toHaveBeenCalled();
			});

			it('recieves fulfilled value', () => {
				const callback = vi.fn();
				let reject;
				new ImmediatePromise((_, rej) => {
					reject = rej;
				}).catch(callback);
				reject(1);
				expect(callback).toHaveBeenCalledWith(1);
			});

			it('gets ignored on filfilled promise', async () => {
				let resolve;
				const promise = new ImmediatePromise((res) => {
					resolve = res;
				}).catch(() => {
					assert.fail('`.catch` callback called'); // TODO then wird das aufgerufen=
				}).getOrdinaryPromise(null);
				resolve();
				await promise;
			});
		});

		describe('derived promise', () => {
			it('returns promise with same value if callback is empty', () => {
				const callback = vi.fn();
				let reject;
				new ImmediatePromise((_, rej) => {
					reject = rej;
				}).catch().catch(callback);
				reject(1);
				expect(callback).toHaveBeenCalledWith(1);
			});

			it('returns promise with returned value', () => {
				const callback = vi.fn();
				let reject;
				new ImmediatePromise((_, rej) => {
					reject = rej;
				}).catch(() => {
					return 2;
				}).then(callback);
				reject(1);
				expect(callback).toHaveBeenCalledWith(2);
			});

			it('does not flatten returned promise likes', () => {
				const callback = vi.fn();
				let reject, res;
				const promise = new ImmediatePromise((r) => {
					res = r;
				});
				new ImmediatePromise((_, rej) => {
					reject = rej;
				}).catch(callback);
				reject(promise);
				res(2);
				expect(callback).toHaveBeenCalledWith(promise);
			});

			it('returns rejected promise if error is thrown', () => {
				const callback = vi.fn();
				let reject;
				new ImmediatePromise((_, rej) => {
					reject = rej;
				}).catch(() => {
					throw 2;
				}).catch(callback);
				reject(1);
				expect(callback).toHaveBeenCalledWith(2);
			});

			it('returns fulfilled promise if ancestor is fulfilled', () => {
				const callback = vi.fn();
				let resolve;
				new ImmediatePromise((res) => {
					resolve = res;
				}).catch(() => {
					return 2;
				}).then(callback);
				resolve(1);
				expect(callback).toHaveBeenCalledWith(1);
			});
		});
	});

	describe('`.finally` works', () => {
		describe('callback handling', () => {
			it('callback gets called immediately on resolved promise', () => {
				const callback = vi.fn();
				let resolve;
				new ImmediatePromise((res) => {
					resolve = res;
				}).finally(callback);
				resolve(2);
				expect(callback).toHaveBeenCalled();
			});

			it('callback gets called immediately on rejected promise', () => {
				const callback = vi.fn();
				let reject;
				new ImmediatePromise((_, rej) => {
					reject = rej;
				}).catch(callback);
				reject(2);
				expect(callback).toHaveBeenCalled();
			});
		});

		describe('derived promise', () => {
			it('returns resolved promise if called on resolved promise', () => {
				const callback = vi.fn();
				let resolve;
				new ImmediatePromise((res) => {
					resolve = res;
				}).finally(() => {
				}).then(callback);
				resolve(1);
				expect(callback).toHaveBeenCalled();
			});

			it('returns rejected promise if called on rejected promise', () => {
				const callback = vi.fn();
				let reject;
				new ImmediatePromise((_, rej) => {
					reject = rej;
				}).finally(() => {
				}).catch(callback);
				reject(1);
				expect(callback).toHaveBeenCalledWith(1);
			});

			it('returns rejected promise if throwed on resolved promise', () => {
				const callback = vi.fn();
				let resolve;
				new ImmediatePromise((res) => {
					resolve = res;
				}).finally(() => {
					throw 2;
				}).catch(callback);
				resolve(1);
				expect(callback).toHaveBeenCalledWith(2);
			});

			it('returns rejected promise if throwed on rejected promise', () => {
				const callback = vi.fn();
				let reject;
				new ImmediatePromise((_, rej) => {
					reject = rej;
				}).finally(() => {
					throw 2;
				}).catch(callback);
				reject(1);
				expect(callback).toHaveBeenCalledWith(2);
			});
		});
	});

	describe('`.cancel` works', () => {
		describe('basic', () => {
			it('calls onCleanup', () => {
				const callback = vi.fn();
				const promise = new ImmediatePromise((_res, _rej, onCleanup) => {
					onCleanup(callback);
				});
				promise.cancel();
				expect(callback).toHaveBeenCalled();
			});

			describe('cannot attach after cancel', () => {
				it('.then', () => {
					const promise = new ImmediatePromise(() => {});
					promise.cancel();

					assert.throws(() => {
						promise.then(() => {});
					});
				});

				it('.catch', () => {
					const promise = new ImmediatePromise(() => {});
					promise.cancel();

					assert.throws(() => {
						promise.catch(() => {});
					});
				});

				it('.finally', () => {
					const promise = new ImmediatePromise(() => {});
					promise.cancel();

					assert.throws(() => {
						promise.finally(() => {});
					});
				});

				it('.getOrdinaryPromise', () => {
					const promise = new ImmediatePromise(() => {});
					promise.cancel();

					assert.throws(() => {
						promise.getOrdinaryPromise(null);
					});
				});
			});

			it('calling cancel multiple times', () => {
				const cleanupCb = vi.fn();
				const promise = new ImmediatePromise((res, rej, onCleanup) => {
					onCleanup(cleanupCb);
				});
				promise.cancel();
				promise.cancel();

				expect(cleanupCb).toHaveBeenCalledOnce();
			});

			describe('ignores cancel after settle', () => {
				it('ignores cancel after resolve', () => {
					let resolve;
					const promise = new ImmediatePromise(res => resolve = res);
					resolve(1);
					assert.doesNotThrow(() => {
						promise.cancel();
					});
				});

				it('ignores cancel after reject', () => {
					let reject;
					const promise = new ImmediatePromise((res, rej) => reject = rej);
					promise.catch(() => {});
					reject(1);
					assert.doesNotThrow(() => {
						promise.cancel();
					});
				});
			});

			describe('cant settle after cancel', () => {
				describe('ignores resolve after cancel', () => {
					it('basic', async () => {
						let resolve;
						const promise = new ImmediatePromise(res => resolve = res);
						const ordinaryPromise = promise.then().getOrdinaryPromise(null);
						promise.cancel();
						resolve(true);

						const promiseResolved = await Promise.race([
							ordinaryPromise,
							new Promise(res => setTimeout(() => res(false), 0)),
						]);
						assert.isFalse(promiseResolved);
					});

					it('ordinary promise', async () => {
						let resolve;
						const promise = new ImmediatePromise(res => resolve = res);
						const ordinaryPromise = promise.getOrdinaryPromise(null);
						promise.cancel();
						resolve(true);

						const promiseResolved = await Promise.race([
							ordinaryPromise,
							new Promise(res => setTimeout(() => res(false), 0)),
						]);
						assert.isFalse(promiseResolved);
					});

					it('ignores settle in cleanup handler', async () => {
						const promise = new ImmediatePromise((res, rej, onCleanup) => {
							onCleanup(() => {
								res(true);
							});
						});
						const ordinaryPromise = promise.getOrdinaryPromise(null);
						promise.cancel();

						const promiseResolved = await Promise.race([
							ordinaryPromise,
							new Promise(res => setTimeout(() => res(false), 0)),
						]);
						assert.isFalse(promiseResolved);
					});
				});

				describe('ignores reject after cancel', () => {
					it('basic', async () => {
						let reject;
						const promise = new ImmediatePromise((res, rej) => reject = rej);
						const ordinaryPromise = promise.catch(e => e).getOrdinaryPromise(null);
						promise.cancel();
						reject(true);

						const promiseResolved = await Promise.race([
							ordinaryPromise,
							new Promise(res => setTimeout(() => res(false), 0)),
						]);
						assert.isFalse(promiseResolved);
					});

					it('ordinary promise', async () => {
						let reject;
						const promise = new ImmediatePromise((res, rej) => reject = rej);
						const ordinaryPromise = promise.getOrdinaryPromise(null).catch(e => e);
						promise.cancel();
						reject(true);

						const promiseResolved = await Promise.race([
							ordinaryPromise,
							new Promise(res => setTimeout(() => res(false), 0)),
						]);
						assert.isFalse(promiseResolved);
					});
				});
			});
		});

		describe('cancels parent promises', () => {
			it('basic', () => {
				const promiseA = new ImmediatePromise(() => {});
				const promiseB = promiseA.then(() => {});

				promiseB.cancel();

				// for asyncCancellation we require this to happen synchronously
				assert(isImmediatePromiseSettled(promiseA));
			});

			it('deep', () => {
				const promiseA = new ImmediatePromise(() => {});
				const promiseB = promiseA.then(() => {});
				const promiseC = promiseB.then(() => {});

				promiseC.cancel();

				assert(isImmediatePromiseSettled(promiseA));
			});

			describe('checks for siblings', () => {
				it('does not cancel if sibling is not cancelled', () => {
					const promiseA = new ImmediatePromise(() => {});
					const promiseB = promiseA.then(() => {});
					// eslint-disable-next-line @typescript-eslint/no-unused-vars
					const promiseC = promiseA.then(() => {});

					promiseB.cancel();

					assert.isFalse(isImmediatePromiseSettled(promiseA));
				});

				it('cancel if all sibling are cancelled', () => {
					const promiseA = new ImmediatePromise(() => {});
					const promiseB = promiseA.then(() => {});
					const promiseC = promiseA.then(() => {});

					promiseB.cancel();
					promiseC.cancel();

					assert(isImmediatePromiseSettled(promiseA));
				});
			});

			it('checks for exposed ordinary promise', () => {
				const promiseA = new ImmediatePromise(() => {});
				const promiseB = promiseA.then(() => {});
				// eslint-disable-next-line @typescript-eslint/no-unused-vars
				const promiseC = promiseA.getOrdinaryPromise(null);

				promiseB.cancel();

				assert.isFalse(isImmediatePromiseSettled(promiseA));
			});
		});
	});

	describe('global events', () => {
		it('unhandledrejection gets emitted', async () => {
			await new Promise(r => setTimeout(r, 1)); // TODO find better solution

			using unhandledrejection = bindPromiseRejectionEventsHandler('unhandledrejection', vi.fn());

			let reject;
			new ImmediatePromise((_, rej) => {
				reject = rej;
			});
			reject(new Error('TestError'));

			await new Promise(r => setTimeout(r, 1)); // 0 does not work in Firefox
			expect(unhandledrejection.handler).toHaveBeenCalledOnce();
		});

		it('unhandledrejection gets emitted with empty catch', async () => {
			// const PromiseMock = vi.fn(() => ({
			// 	disconnect: vi.fn(),
			// 	observe: vi.fn(),
			// 	takeRecords: vi.fn(),
			// 	unobserve: vi.fn(),
			// }))

			// const rej = vi.fn();

			// class PromiseMock {
			// 	constructor(cb) {
			// 		return new Promise((res, rej) => {
			// 			cb(res, rej);
			// 		})
			// 	}
			// 	static all = Promise.all;
			// 	static race = Promise.race;
			// 	static resolve = Promise.resolve;
			// 	static reject = Promise.reject;
			// 	static allSettled = Promise.allSettled;
			// }

			// vi.stubGlobal('Promise', PromiseMock)

			using unhandledrejection = bindPromiseRejectionEventsHandler('unhandledrejection', vi.fn());

			let reject;
			new ImmediatePromise((_, rej) => {
				reject = rej;
			}).catch();
			reject(new Error('TestError'));

			await new Promise(r => setTimeout(r, 1)); // 0 does not work in Firefox
			expect(unhandledrejection.handler).toHaveBeenCalledOnce();

			// vi.unstubAllGlobals();
		});

		it('unhandledrejection gets emitted when ordinary promise is unhandled', async () => {
			using unhandledrejection = bindPromiseRejectionEventsHandler('unhandledrejection', vi.fn());

			let reject;
			const promise = new ImmediatePromise((_, rej) => {
				reject = rej;
			});
			promise.catch(() => 1);
			promise.getOrdinaryPromise(null);

			reject(new Error('TestError'));

			await new Promise(r => setTimeout(r, 1)); // 0 does not work in Firefox
			expect(unhandledrejection.handler).toHaveBeenCalledOnce();
		});

		it('unhandledrejection does not get emitted', async () => {
			using unhandledrejection = bindPromiseRejectionEventsHandler('unhandledrejection', vi.fn());

			let reject;
			new ImmediatePromise((_, rej) => {
				reject = rej;
			}).catch(() => 1);
			reject(1);

			await new Promise(r => setTimeout(r, 1)); // 0 does not work in Firefox
			expect(unhandledrejection.handler).not.toHaveBeenCalled();
		});

		it('unhandledrejection does not get emitted when ordinary promise is handled', async () => {
			using unhandledrejection = bindPromiseRejectionEventsHandler('unhandledrejection', vi.fn());

			let reject;
			new ImmediatePromise((_, rej) => {
				reject = rej;
			}).getOrdinaryPromise(null).catch(() => 1);

			reject(1);

			await new Promise(r => setTimeout(r, 1)); // 0 does not work in Firefox
			expect(unhandledrejection.handler).not.toHaveBeenCalled();
		});

		it('rejectionhandled gets emitted when ordinary promise is handled', async () => {
			using unhandledrejection = bindPromiseRejectionEventsHandler('unhandledrejection', vi.fn());
			using rejectionhandled = bindPromiseRejectionEventsHandler('rejectionhandled', vi.fn());

			let reject;
			const promise = new ImmediatePromise((_, rej) => {
				reject = rej;
			}).getOrdinaryPromise(null);

			reject(new Error('TestError'));
			setTimeout(() => {
				promise.catch(() => 1);
			}, 0);

			await new Promise(r => setTimeout(r, 10));
			expect(unhandledrejection.handler).toHaveBeenCalledOnce();
			expect(rejectionhandled.handler).toHaveBeenCalledOnce();
		});
	});

	it('throws if deriving from an already resolved promise', () => {
		let resolve;
		const promise = new ImmediatePromise((res) => {
			resolve = res;
		});
		resolve(1);
		assert.throws(() => {
			promise.then();
		});
		assert.throws(() => {
			promise.then(() => {});
		});
		assert.throws(() => {
			promise.then(() => {}, () => {});
		});
		assert.throws(() => {
			promise.then(null, () => {});
		});
		assert.throws(() => {
			promise.catch();
		});
		assert.throws(() => {
			promise.catch(() => {});
		});
		assert.throws(() => {
			promise.finally();
		});
		assert.throws(() => {
			promise.finally(() => {});
		});
	});

	describe('`.getOrdinaryPromise` works', () => {
		it('returns instance of Promise', () => {
			const immediatePromise = new ImmediatePromise(() => {});
			assert.ok(immediatePromise.getOrdinaryPromise(null) instanceof Promise);
		});

		it('resolves when immediatePromise gets resolved', async () => {
			let resolve;
			const promise = new ImmediatePromise((res) => {
				resolve = res;
			}).getOrdinaryPromise(null);
			resolve(1);
			assert.strictEqual(await promise, 1);
		});

		it('rejects when immediatePromise gets rejected', async () => {
			const callback = vi.fn();
			let reject;
			const promise = new ImmediatePromise((_, rej) => {
				reject = rej;
			}).getOrdinaryPromise(null);
			reject(1);
			await promise.catch(callback);
			expect(callback).toHaveBeenCalledWith(1);
		});

		// discarded since ImmediatePromises can be cancelled
		it.skip('can be called after immediatePromise was resolved', async () => {
			let resolve;
			const immediatePromise = new ImmediatePromise((res) => {
				resolve = res;
			});
			resolve(1);
			const promise = immediatePromise.getOrdinaryPromise(null);
			assert.strictEqual(await promise, 1);
		});

		describe('signal', () => {
			it('throws on already resolved signals', () => {
				const controller = new AbortController();
				const promise = new ImmediatePromise(() => {});
				controller.abort();

				assert.throws(() => {
					promise.getOrdinaryPromise(controller.signal);
				});
			});

			it('works with one signal', () => {
				const cleanup = vi.fn();
				const controller = new AbortController();
				const promise = new ImmediatePromise((res, rej, onCleanup) => {
					onCleanup(cleanup);
				});
				promise.getOrdinaryPromise(controller.signal);
				controller.abort();

				expect(cleanup).toHaveBeenCalled();
			});

			it('works with two signals', () => {
				const cleanupA = vi.fn();
				const controllerA = new AbortController();
				const controllerB = new AbortController();
				const promise = new ImmediatePromise((res, rej, onCleanup) => {
					onCleanup(cleanupA);
				});
				promise.getOrdinaryPromise(controllerA.signal);
				promise.getOrdinaryPromise(controllerB.signal);

				controllerA.abort();
				expect(cleanupA).not.toHaveBeenCalled();

				controllerB.abort();
				expect(cleanupA).toHaveBeenCalled();
			});

			describe('works with other childs', () => {
				it('ordinary promise first', () => {
					const cleanupA = vi.fn();
					const controllerA = new AbortController();
					const promise = new ImmediatePromise((res, rej, onCleanup) => {
						onCleanup(cleanupA);
					});
					promise.getOrdinaryPromise(controllerA.signal);
					const child = promise.then(() => {});

					controllerA.abort();
					expect(cleanupA).not.toHaveBeenCalled();

					child.cancel();
					expect(cleanupA).toHaveBeenCalled();
				});

				it('child first', () => {
					const cleanupA = vi.fn();
					const controllerA = new AbortController();
					const promise = new ImmediatePromise((res, rej, onCleanup) => {
						onCleanup(cleanupA);
					});
					promise.getOrdinaryPromise(controllerA.signal);
					const child = promise.then(() => {});

					child.cancel();
					expect(cleanupA).not.toHaveBeenCalled();

					controllerA.abort();
					expect(cleanupA).toHaveBeenCalled();
				});
			});
		});
	});

	describe('`ImmediatePromise.allSettled`', () => {
		it('returns instance of ImmediatePromise', () => {
			assert.ok(ImmediatePromise.allSettled([]) instanceof ImmediatePromise);
		});

		it('resolves asynchronously if ImmediatePromise resolves', async () => {
			const callback = vi.fn();
			let resolve;
			ImmediatePromise.allSettled([new ImmediatePromise((res) => {
				resolve = res;
			})]).then(callback);
			resolve(1);
			expect(callback).not.toHaveBeenCalled();
			await Promise.resolve();
			expect(callback).toHaveBeenCalled();
		});

		it('resolves asynchronously if ImmediatePromise rejects', async () => {
			const callback = vi.fn();
			let reject;
			ImmediatePromise.allSettled([new ImmediatePromise((_, rej) => {
				reject = rej;
			})]).then(callback);
			reject(1);
			expect(callback).not.toHaveBeenCalled();
			await Promise.resolve();
			expect(callback).toHaveBeenCalled();
		});

		it('is chainable if containing resolved promise', async () => {
			const callback = vi.fn();
			const promise = ImmediatePromise.allSettled([Promise.resolve(1)]).then(callback);
			await promise.getOrdinaryPromise(null);
			expect(callback).toHaveBeenCalled();
		});

		it('resolves asynchronously if passed non thenable value', async () => {
			const callback = vi.fn();
			const syncCall = vi.fn();
			const promise = ImmediatePromise.allSettled([1]).then(callback);
			syncCall();
			await promise.getOrdinaryPromise(null);
			expect(syncCall).toHaveBeenCalledBefore(callback);
		});

		describe('cancellation', () => {
			it('cancels ImmediatePromises in array when cancelled', () => {
				const cleanupA = vi.fn();
				const a = new ImmediatePromise((_res, _rej, onCleanup) => {
					onCleanup(cleanupA);
				});

				const cleanupB = vi.fn();
				const b = new ImmediatePromise((_res, _rej, onCleanup) => {
					onCleanup(cleanupB);
				});

				const promise = ImmediatePromise.allSettled([a, b]);
				promise.cancel();

				expect(cleanupA).toHaveBeenCalled();
				expect(cleanupB).toHaveBeenCalled();
			});

			it('works with non ImmediatePromise entries', () => {
				const a = new Promise(() => {});

				const b = 123;

				const promise = ImmediatePromise.allSettled([a, b]);
				assert.doesNotThrow(() => {
					promise.cancel();
				});
			});

			it('cancels ImmediatePromises in array when settled', () => {
				const cleanupA = vi.fn();
				const a = new ImmediatePromise((_res, _rej, onCleanup) => {
					onCleanup(cleanupA);
				});

				const cleanupB = vi.fn();
				const b = new ImmediatePromise((_res, _rej, onCleanup) => {
					onCleanup(cleanupB);
				});

				const promise = ImmediatePromise.allSettled([a, b]);
				promise.cancel();

				expect(cleanupA).toHaveBeenCalled();
				expect(cleanupB).toHaveBeenCalled();
			});
		});
	});

	describe('`ImmediatePromise.all`', () => {
		it('returns instance of ImmediatePromise', () => {
			assert.ok(ImmediatePromise.all([]) instanceof ImmediatePromise);
		});

		it('resolves asynchronously if ImmediatePromise resolves', async () => {
			const callback = vi.fn();
			let resolve;
			ImmediatePromise.all([new ImmediatePromise((res) => {
				resolve = res;
			})]).then(callback);
			resolve(1);
			expect(callback).not.toHaveBeenCalled();
			await Promise.resolve();
			expect(callback).toHaveBeenCalled();
		});

		it('rejects synchronously if ImmediatePromise rejects', () => {
			const callback = vi.fn();
			let reject;
			ImmediatePromise.all([new ImmediatePromise((_, rej) => {
				reject = rej;
			})]).catch(callback);
			reject(1);
			expect(callback).toHaveBeenCalled();
		});

		it('is chainable if containing resolved promise', async () => {
			const callback = vi.fn();
			const promise = ImmediatePromise.all([Promise.resolve(1)]).then(callback);
			await promise.getOrdinaryPromise(null);
			expect(callback).toHaveBeenCalled();
		});

		it('resolves asynchronously if passed non thenable value', async () => {
			const callback = vi.fn();
			const syncCall = vi.fn();
			const promise = ImmediatePromise.all([1]).then(callback);
			syncCall();
			await promise.getOrdinaryPromise(null);
			expect(syncCall).toHaveBeenCalledBefore(callback);
		});

		describe('cancellation', () => {
			it('cancels ImmediatePromises in array when cancelled', () => {
				const cleanupA = vi.fn();
				const a = new ImmediatePromise((_res, _rej, onCleanup) => {
					onCleanup(cleanupA);
				});

				const cleanupB = vi.fn();
				const b = new ImmediatePromise((_res, _rej, onCleanup) => {
					onCleanup(cleanupB);
				});

				const promise = ImmediatePromise.all([a, b]);
				promise.cancel();

				expect(cleanupA).toHaveBeenCalled();
				expect(cleanupB).toHaveBeenCalled();
			});

			it('works with non ImmediatePromise entries', () => {
				const a = new Promise(() => {});

				const b = 123;

				const promise = ImmediatePromise.all([a, b]);
				assert.doesNotThrow(() => {
					promise.cancel();
				});
			});

			it('cancels ImmediatePromises in array when settled', () => {
				const cleanupA = vi.fn();
				const a = new ImmediatePromise((_res, _rej, onCleanup) => {
					onCleanup(cleanupA);
				});

				const cleanupB = vi.fn();
				const b = new ImmediatePromise((_res, _rej, onCleanup) => {
					onCleanup(cleanupB);
				});

				const promise = ImmediatePromise.all([a, b]);
				promise.cancel();

				expect(cleanupA).toHaveBeenCalled();
				expect(cleanupB).toHaveBeenCalled();
			});
		});
	});

	describe('`ImmediatePromise.race`', () => {
		it('returns instance of ImmediatePromise', () => {
			assert.ok(ImmediatePromise.race([]) instanceof ImmediatePromise);
		});

		it('resolves synchronously if ImmediatePromise resolves', () => {
			const callback = vi.fn();
			let resolve;
			ImmediatePromise.race([new ImmediatePromise((res) => {
				resolve = res;
			})]).then(callback);
			resolve(1);
			expect(callback).toHaveBeenCalledWith(1);
		});

		it('rejects synchronously if ImmediatePromise rejects', () => {
			const callback = vi.fn();
			let reject;
			ImmediatePromise.race([new ImmediatePromise((_, rej) => {
				reject = rej;
			})]).catch(callback);
			reject(1);
			expect(callback).toHaveBeenCalledWith(1);
		});

		it('is chainable if containing resolved promise', async () => {
			const callback = vi.fn();
			const promise = ImmediatePromise.race([Promise.resolve(1)]).then(callback);
			await promise.getOrdinaryPromise(null);
			expect(callback).toHaveBeenCalledWith(1);
		});

		it('resolves asynchronously if passed non thenable value', async () => {
			const callback = vi.fn();
			const syncCall = vi.fn();
			const promise = ImmediatePromise.race([1]).then(callback);
			syncCall();
			await promise.getOrdinaryPromise(null);
			expect(syncCall).toHaveBeenCalledBefore(callback);
		});

		it('does not change callback order of promise', async () => {
			let resolve;
			const promise = new Promise(res => resolve = res);
			const callback1 = vi.fn();
			const callback2 = vi.fn();
			const callback3 = vi.fn();
			promise.then(callback1);
			ImmediatePromise.race([promise]).then(callback2);
			promise.then(callback3);

			resolve(2);
			await promise;
			expect(callback1).toHaveBeenCalledBefore(callback2);
			expect(callback2).toHaveBeenCalledBefore(callback3);
		});

		describe('cancellation', () => {
			it('cancels ImmediatePromises in array when cancelled', () => {
				const cleanupA = vi.fn();
				const a = new ImmediatePromise((_res, _rej, onCleanup) => {
					onCleanup(cleanupA);
				});

				const cleanupB = vi.fn();
				const b = new ImmediatePromise((_res, _rej, onCleanup) => {
					onCleanup(cleanupB);
				});

				const promise = ImmediatePromise.race([a, b]);
				promise.cancel();

				expect(cleanupA).toHaveBeenCalled();
				expect(cleanupB).toHaveBeenCalled();
			});

			it('works with non ImmediatePromise entries', () => {
				const a = new Promise(() => {});

				const b = 123;

				const promise = ImmediatePromise.race([a, b]);
				assert.doesNotThrow(() => {
					promise.cancel();
				});
			});

			it('cancels ImmediatePromises in array when settled', () => {
				const cleanupA = vi.fn();
				const a = new ImmediatePromise((_res, _rej, onCleanup) => {
					onCleanup(cleanupA);
				});

				const cleanupB = vi.fn();
				const b = new ImmediatePromise((_res, _rej, onCleanup) => {
					onCleanup(cleanupB);
				});

				const promise = ImmediatePromise.race([a, b]);
				promise.cancel();

				expect(cleanupA).toHaveBeenCalled();
				expect(cleanupB).toHaveBeenCalled();
			});
		});
	});

	describe('`ImmediatePromise.any`', () => {
		it('returns instance of ImmediatePromise', () => {
			assert.ok(ImmediatePromise.any([1]) instanceof ImmediatePromise);
		});

		it('resolves synchronously if ImmediatePromise resolves', () => {
			const callback = vi.fn();
			let resolve;
			ImmediatePromise.any([new ImmediatePromise((res) => {
				resolve = res;
			})]).then(callback);
			resolve(1);
			expect(callback).toHaveBeenCalledWith(1);
		});

		it('rejects asynchronously if ImmediatePromise rejects', async () => {
			const callback = vi.fn();
			let reject;
			ImmediatePromise.any([new ImmediatePromise((_, rej) => {
				reject = rej;
			})]).catch(callback);
			reject(1);
			expect(callback).not.toHaveBeenCalled();
			await Promise.resolve();
			expect(callback).toHaveBeenCalledOnce();
		});

		it('is chainable if containing resolved promise', async () => {
			const callback = vi.fn();
			const promise = ImmediatePromise.any([Promise.resolve(1)]).then(callback);
			await promise.getOrdinaryPromise(null);
			expect(callback).toHaveBeenCalledWith(1);
		});

		it('resolves asynchronously if passed non thenable value', async () => {
			const callback = vi.fn();
			const syncCall = vi.fn();
			const promise = ImmediatePromise.any([1]).then(callback);
			syncCall();
			await promise.getOrdinaryPromise(null);
			expect(syncCall).toHaveBeenCalledBefore(callback);
		});

		it('does not change callback order of promise', async () => {
			let resolve;
			const promise = new Promise(res => resolve = res);
			const callback1 = vi.fn();
			const callback2 = vi.fn();
			const callback3 = vi.fn();
			promise.then(callback1);
			ImmediatePromise.any([promise]).then(callback2);
			promise.then(callback3);

			resolve(2);
			await promise;
			expect(callback1).toHaveBeenCalledBefore(callback2);
			expect(callback2).toHaveBeenCalledBefore(callback3);
		});

		describe('cancellation', () => {
			it('cancels ImmediatePromises in array when cancelled', () => {
				const cleanupA = vi.fn();
				const a = new ImmediatePromise((_res, _rej, onCleanup) => {
					onCleanup(cleanupA);
				});

				const cleanupB = vi.fn();
				const b = new ImmediatePromise((_res, _rej, onCleanup) => {
					onCleanup(cleanupB);
				});

				const promise = ImmediatePromise.any([a, b]);
				promise.cancel();

				expect(cleanupA).toHaveBeenCalled();
				expect(cleanupB).toHaveBeenCalled();
			});

			it('works with non ImmediatePromise entries', () => {
				const a = new Promise(() => {});

				const b = 123;

				const promise = ImmediatePromise.any([a, b]);
				assert.doesNotThrow(() => {
					promise.cancel();
				});
			});

			it('cancels ImmediatePromises in array when settled', () => {
				const cleanupA = vi.fn();
				const a = new ImmediatePromise((_res, _rej, onCleanup) => {
					onCleanup(cleanupA);
				});

				const cleanupB = vi.fn();
				const b = new ImmediatePromise((_res, _rej, onCleanup) => {
					onCleanup(cleanupB);
				});

				const promise = ImmediatePromise.any([a, b]);
				promise.cancel();

				expect(cleanupA).toHaveBeenCalled();
				expect(cleanupB).toHaveBeenCalled();
			});
		});
	});
});
