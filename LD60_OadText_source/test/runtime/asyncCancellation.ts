/* eslint-disable @typescript-eslint/no-confusing-void-expression */
/* eslint-disable @typescript-eslint/no-floating-promises */
/* eslint-disable @typescript-eslint/prefer-promise-reject-errors */
/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/use-unknown-in-catch-callback-variable */

import { describe, it, assert, vi, expect } from 'vitest';

import { mockPromise, expectCallOrder } from '../__utils';
import { cancelContext, CancellationError, getCancellationSignal } from 'engine/Runtime/cancellation';
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

describe('async function cancellation', () => {
	describe('basic functionality', () => {
		it('cancels execution', () => {
			const promise = mockPromise();
			const callback = vi.fn();
			const context = {};

			(async function() {
				await promise;
				callback();
			}).call(context);
			cancelContext(context);
			promise.resolve();
			return promise.then(() => {
				expect(callback).not.toHaveBeenCalled();
			});
		});

		it('cancels execution when resolving first', () => {
			const promise = Promise.resolve();
			const callback = vi.fn();
			const context = {};

			(async function() {
				await promise;
				callback();
			}).call(context);
			cancelContext(context);
			return promise.then(() => {
				expect(callback).not.toHaveBeenCalled();
			});
		});

		it('throws a CancellationError', () => {
			const callback = vi.fn();
			const context = {};

			const promise = (async function() {
				await new Promise(() => {});
				callback();
			}).call(context);
			cancelContext(context);
			return promise
				.catch(callback)
				.finally(() => {
					assert(callback.mock.calls[0][0] instanceof CancellationError);
				});
		});

		it('throws a CancellationError when resolving first', () => {
			const callback = vi.fn();
			const context = {};

			const promise = (async function() {
				await Promise.resolve();
				callback();
			}).call(context);
			cancelContext(context);
			return promise
				.catch(callback)
				.finally(() => {
					assert(callback.mock.calls[0][0] instanceof CancellationError);
				});
		});

		it('does not execute when context is already cancelled', () => {
			const callback = vi.fn();
			const context = {};
			cancelContext(context);

			const promise = (async function() {
				callback();
			}).call(context);
			return promise
				.catch(e => e)
				.finally(() => {
					expect(callback).not.toHaveBeenCalled();
				});
		});
	});

	describe('cancels awaited promises', () => {
		it('basic functionality', () => {
			const clearupCb = vi.fn();
			const context = {};

			(async function() {
				await new ImmediatePromise((res, rej, onCleanup) => {
					onCleanup(clearupCb);
				});
			}).call(context);
			cancelContext(context);

			expect(clearupCb).toHaveBeenCalledOnce();
		});

		describe('cancellation order timing', () => {
			it('cancels functions before side effects of promise cancel', () => {
				const context = {};
				let promiseResolved = false;

				let promiseB;
				const promiseA = new ImmediatePromise((_res, _rej, onCleanupA) => {
					promiseB = new ImmediatePromise((res) => {
						onCleanupA(() => res(true));
						// warning: onCleanupB also gets called when promise B resolves
					});
				});

				(async function() {
					await promiseA;
				}).call(context);
				(async function() {
					promiseResolved = await promiseB;
				}).call(context);

				cancelContext(context);

				assert.isFalse(promiseResolved);
			});

			describe('cancels promises before side effects of function cancel', () => {
				it('basic', () => {
					const context = {};
					const promise = new ImmediatePromise(() => {});
					let promiseCancelled = false;

					(async function() {
						try {
							await promise;
						} finally {
							promiseCancelled = isImmediatePromiseSettled(promise);
						}
					}).call(context);

					cancelContext(context);

					assert(promiseCancelled);
				});

				it('multiple', () => {
					const context = {};
					const promise = new ImmediatePromise(() => {});
					let cancelled = false;

					(async function() {
						try {
							await new Promise(() => {});
						} finally {
							cancelled = isImmediatePromiseSettled(promise);
						}
					}).call(context);
					(async function() {
						await promise;
					}).call(context);

					cancelContext(context);

					assert(cancelled);
				});
			});
		});
	});

	describe('unhandled rejection events', () => {
		it('cancellation does not emit unhandled rejection event', async () => {
			const context = {};

			using unhandledrejection = bindPromiseRejectionEventsHandler('unhandledrejection', vi.fn());

			(async function() {
				await new Promise(() => {});
			}).call(context);
			cancelContext(context);

			await new Promise((res) => {
				setTimeout(res, 100);
			})
				.then(() => {
					expect(unhandledrejection.handler).not.toHaveBeenCalled();
				});
		});

		it('ordinary errors emit unhandled rejection event', async () => {
			const context = {};

			using unhandledrejection = bindPromiseRejectionEventsHandler('unhandledrejection', vi.fn());

			(async function() {
				throw new Error('TestError');
			}).call(context);

			await new Promise((res) => {
				setTimeout(res, 100);
			})
				.then(() => {
					expect(unhandledrejection.handler).toHaveBeenCalled();
				});
		});

		it('errors can be catched', async () => {
			const context = {};

			using unhandledrejection = bindPromiseRejectionEventsHandler('unhandledrejection', vi.fn());

			const promise = (async function() {
				throw new Error();
			}).call(context);

			promise.catch(() => {});

			await new Promise((res) => {
				setTimeout(res, 100);
			})
				.then(() => {
					expect(unhandledrejection.handler).not.toHaveBeenCalled();
				});
		});
	});

	describe('catch blocks', () => {
		it('catch blocks do not execute on cancel', () => {
			const promise1 = mockPromise();
			const callback = vi.fn();
			const context = {};

			const promise = async function() {
				try {
					await promise1;
				} catch {
					callback();
				}
			}.call(context);
			cancelContext(context);
			promise1.reject();
			return promise
				.catch(e => e)
				.finally(() => {
					expect(callback).not.toHaveBeenCalled();
				});
		});

		it('catch blocks does not catch canellation error of same context', () => {
			const callback = vi.fn();
			const context = {};

			const promise = async function() {
				try {
					await async function() {
						await new Promise(() => {});
					}.call(context);
				} catch {
					callback();
				}
			}.call(context);
			cancelContext(context);
			return promise
				.catch(e => e)
				.finally(() => {
					expect(callback).not.toHaveBeenCalled();
				});
		});

		it('catch blocks catches canellation error of other context', () => {
			const callback = vi.fn();
			const outerContext = {};
			const innerContext = {};

			const promise = async function() {
				try {
					await async function() {
						await new Promise(() => {});
					}.call(innerContext);
				} catch {
					callback();
				}
			}.call(outerContext);
			cancelContext(innerContext);
			return promise
				.catch(e => e)
				.finally(() => {
					expect(callback).toHaveBeenCalled();
				});
		});
	});

	describe('finally blocks execute', () => {
		it('simple case', () => {
			const callback = vi.fn();
			const context = {};

			const promise = async function() {
				try {
					await new Promise(() => {});
				} finally {
					callback();
				}
			}.call(context);
			cancelContext(context);
			return promise
				.catch(e => e)
				.finally(() => {
					expect(callback).toHaveBeenCalled();
				});
		});

		describe('nested blocks', () => {
			it('simple case', () => {
				const callback = vi.fn();
				const context = {};

				const promise = async function() {
					try {
						try {
							await new Promise(() => {});
						} finally {
							callback();
						}
					} finally {
						callback();
					}
				}.call(context);
				cancelContext(context);
				return promise
					.catch(e => e)
					.finally(() => {
						expect(callback).toHaveBeenCalledTimes(2);
					});
			});
		});

		it('does not execute code after finally', () => {
			const callback = vi.fn();
			const context = {};

			const promise = async function() {
				try {
					await new Promise(() => {});
				} finally {
				}
				callback();
			}.call(context);
			cancelContext(context);
			return promise
				.catch(e => e)
				.finally(() => {
					expect(callback).not.toHaveBeenCalled();
				});
		});

		describe("finally blocks can't alter return value", () => {
			it("can't return value", () => {
				const callback = vi.fn();
				const context = {};

				const promise = (async function() {
					try {
						await new Promise(() => {});
					} finally {
						return 1;
					}
				}).call(context);
				cancelContext(context);
				return promise
					.catch(callback)
					.finally(() => {
						assert(callback.mock.calls[0][0] instanceof CancellationError);
					});
			});

			it("can't throw new error", () => {
				const callback = vi.fn();
				const context = {};

				const promise = (async function() {
					try {
						await new Promise(() => {});
					} finally {
						throw new Error('TestError');
					}
				}).call(context);
				cancelContext(context);
				return promise
					.catch(callback)
					.finally(() => {
						assert(callback.mock.calls[0][0] instanceof CancellationError);
					});
			});

			it('can await in finally blocks after cancellation', () => {
				const callback = vi.fn();
				const context = {};
				const promiseInFinally = mockPromise();
				const finallyPromise = mockPromise();

				const promise = (async function() {
					try {
						try {
							await new Promise(() => {});
						} finally {
							await promiseInFinally;
						}
					} finally {
						callback();
						finallyPromise.resolve();
					}
				}).call(context);
				cancelContext(context);
				return Promise.all([
					promise
						.catch(() => {})
						.finally(() => {
							expect(callback).not.toHaveBeenCalled();
							promiseInFinally.resolve();
						}),
					finallyPromise
						.finally(() => {
							expect(callback).toHaveBeenCalledOnce();
						}),
				]);
			});
		});

		describe('finally blocks will continue execution', () => {
			it('simple case', () => {
				const callback = vi.fn();
				const context = {};
				const firstPromise = mockPromise();
				const secondPromise = mockPromise();

				const promise = async function() {
					try {
						await firstPromise;
					} finally {
						callback();
						await secondPromise;
						callback();
					}
				}.call(context);
				firstPromise.resolve();
				firstPromise.then(() => {
					expect(callback).toHaveBeenCalledOnce();
				});
				secondPromise.resolve();
				cancelContext(context);
				return promise
					.finally(() => {
						expect(callback).toHaveBeenCalledTimes(2);
					})
					.catch(e => {
						assert(e instanceof CancellationError);
					});
			});

			it('cancelation while suspended in finally block', () => {
				const callback = vi.fn();
				const context = {};
				const firstPromise = mockPromise();
				const finalPromise = mockPromise();

				(async function() {
					try {
					} finally {
						await firstPromise;
						callback();
						finalPromise.resolve();
					}
				}).call(context);

				cancelContext(context);
				firstPromise.resolve();
				return finalPromise
					.finally(() => {
						expect(callback).toHaveBeenCalledOnce();
					});
			});

			it('nested finally blocks', () => {
				const callback = vi.fn();
				const context = {};
				const firstPromise = mockPromise();
				const secondPromise = mockPromise();
				const thirdPromise = mockPromise();
				const finalPromise = mockPromise();

				(async function() {
					try {
					} finally {
						try {
							await firstPromise;
						} finally {
							await secondPromise;
							callback();
						}
						await thirdPromise;
						callback();
						finalPromise.resolve();
					}
				}).call(context);
				firstPromise.resolve();
				firstPromise.then(() => {
					cancelContext(context);
					secondPromise.resolve();
					thirdPromise.resolve();
				});
				return finalPromise
					.finally(() => {
						expect(callback).toHaveBeenCalledTimes(2);
					});
			});
		});

		it('still awaits promise after cancel', () => {
			const context = {};
			const callback = vi.fn();
			const promise = mockPromise();

			(async function() {
				try {
				} finally {
					// force lockReturnCalls transformation
					await promise;
					callback();
				}
			}).call(context);

			cancelContext(context);

			return new Promise((res) => {
				setTimeout(res, 0);
			})
				.then(() => {
					expect(callback).not.toHaveBeenCalled();
					return promise.resolve();
				})
				.then(() => {
					expect(callback).toHaveBeenCalled();
				});
		});

		it('callbacks on Promises are only registered once', () => {
			const context = {};
			const callback1 = vi.fn();
			const callback2 = vi.fn();
			const promise = mockPromise();

			(async function() {
				try {
				} finally {
					// force lockReturnCalls transformation
					await promise;
					callback1();
				}
			}).call(context);

			promise.then(callback2);

			cancelContext(context);

			promise.resolve();

			return new Promise((res) => {
				setTimeout(res, 0);
			})
				.then(() => {
					return new Promise((res) => {
						setTimeout(res, 0);
					});
				})
				.then(() => {
					expectCallOrder(callback1, callback2);
				});
		});
	});

	describe('yielded promises after error are awaited', () => {
		it('when not cancelled', () => {
			const callback = vi.fn();
			const error = new Error();
			const promise = mockPromise();

			(async function() {
				try {
					await Promise.reject(error);
				} catch (e) {
					await promise;
				} finally {
					callback();
					// force lockReturnCalls transformation
					await Promise.resolve();
				}
			})();

			return new Promise((res) => {
				setTimeout(res, 0);
			})
				.then(() => {
					expect(callback).not.toHaveBeenCalled();
					return promise.resolve();
				})
				.then(() => {
					expect(callback).toHaveBeenCalled();
				});
		});

		it('when cancelled', () => {
			const context = {};
			const callback = vi.fn();
			const error = new Error();
			const promise = mockPromise();

			(async function() {
				try {
					await new Promise(() => {});
				} finally {
					try {
						await Promise.reject(error);
					} catch (e) {
						await promise;
					} finally {
						callback();
						// force lockReturnCalls transformation
						await Promise.resolve();
					}
				}
			}).call(context);

			cancelContext(context);

			return new Promise((res) => {
				setTimeout(res, 0);
			})
				.then(() => {
					expect(callback).not.toHaveBeenCalled();
					return promise.resolve();
				})
				.then(() => {
					expect(callback).toHaveBeenCalled();
				});
		});
	});

	describe('yielding continueWithLastYieldToken continues execution', () => {
		it('yields continueWithLastYieldToken first', () => {
			const promise = (async function() {
				try {
				} finally {
					// generates yield of continueWithLastYieldToken
					if (Math.random() > 1) {
						await new Promise(() => {});
					}
				}
			})();

			// asserts promise resolves
			return promise;
		});

		it('sequential yields', () => {
			const firstPromise = mockPromise();

			const promise = (async function() {
				try {
					await firstPromise;
				} finally {
					// generates yield of continueWithLastYieldToken
					if (Math.random() > 1) {
						await new Promise(() => {});
					}
				}
				try {
				} finally {
					// generates yield of continueWithLastYieldToken
					if (Math.random() > 1) {
						await new Promise(() => {});
					}
				}
			})();
			firstPromise.resolve();

			// asserts promise resolves
			return promise;
		});

		it('resolves when returning after yielding continueWithLastYieldToken', () => {
			const callback = vi.fn();

			const promise = (async function() {
				try {
				} finally {
					// generates yield of continueWithLastYieldToken
					if (Math.random() > 1) {
						await new Promise(() => {});
					}
				}
				return 1;
			})();

			return promise
				.then(callback)
				.finally(() => {
					assert(callback.mock.calls[0][0] === 1);
				});
		});

		it('catches errors after yielding continueWithLastYieldToken', () => {
			const callback = vi.fn();
			const error = new Error();

			const promise = (async function() {
				try {
				} finally {
					// generates yield of continueWithLastYieldToken
					if (Math.random() > 1) {
						await new Promise(() => {});
					}
				}
				throw error;
			})();

			return promise
				.catch(callback)
				.finally(() => {
					assert(callback.mock.calls[0][0] === error);
				});
		});
	});

	describe('order of canellation is deterministic', () => {
		it('basic case', () => {
			const context = {};
			const callback1 = vi.fn();
			const callback2 = vi.fn();
			const callback3 = vi.fn();

			const promise1 = (async function() {
				await new Promise(() => {});
			}).call(context).catch(callback1);

			const promise2 = (async function() {
				await new Promise(() => {});
			}).call(context).catch(callback2);

			const promise3 = (async function() {
				await new Promise(() => {});
			}).call(context).catch(callback3);

			cancelContext(context);

			return Promise.all([promise1, promise2, promise3]).then(() => {
				expectCallOrder(callback1, callback2, callback3);
			});
		});

		it('with early resolved Promise', () => {
			const context = {};
			const callback1 = vi.fn();
			const callback2 = vi.fn();
			const callback3 = vi.fn();
			const promise = Promise.resolve();

			const promise1 = (async function() {
				await new Promise(() => {});
			}).call(context).catch(callback1);

			const promise2 = (async function() {
				await promise;
				await new Promise(() => {});
			}).call(context).catch(callback2);

			const promise3 = (async function() {
				await new Promise(() => {});
			}).call(context).catch(callback3);

			cancelContext(context);

			return Promise.all([promise1, promise2, promise3]).then(() => {
				expectCallOrder(callback1, callback2, callback3);
			});
		});

		it('with early resolved ImmediatePromise', () => {
			const context = {};
			const callback1 = vi.fn();
			const callback2 = vi.fn();
			const callback3 = vi.fn();

			let resolve;
			const promise = new ImmediatePromise(res => resolve = res);

			const promise1 = (async function() {
				await new Promise(() => {});
			}).call(context).catch(callback1);

			const promise2 = (async function() {
				await promise;
				await new Promise(() => {});
			}).call(context).catch(callback2);

			const promise3 = (async function() {
				await new Promise(() => {});
			}).call(context).catch(callback3);

			resolve();
			cancelContext(context);

			return Promise.all([promise1, promise2, promise3]).then(() => {
				expectCallOrder(callback1, callback2, callback3);
			});
		});
	});

	describe('can be called with invalid context', () => {
		it('does not throw with context undefined', () => {
			return (async function() {
				await Promise.resolve(1);
			})();
		});

		it('does not throw with number as context', () => {
			return (async function() {
				await Promise.resolve(1);
			}).call(1);
		});
	});

	describe('getCancellationSignal', () => {
		it('is not aborted if context is not cancelled', () => {
			const context = {};
			assert.isFalse(getCancellationSignal(context).aborted);
		});

		it('has reason if context got cancelled', () => {
			const context = {};
			cancelContext(context);
			const error = getCancellationSignal(context).reason;
			assert.instanceOf(error, CancellationError);
			assert.equal(error?.context, context);
		});

		it('returns the same signal', () => {
			const context = {};
			cancelContext(context);
			const signal1 = getCancellationSignal(context);
			cancelContext(context);
			const signal2 = getCancellationSignal(context);
			assert.equal(signal1, signal2);
		});
	});
});
