/* eslint-disable @typescript-eslint/await-thenable */
/* eslint-disable @typescript-eslint/no-confusing-void-expression */
/* eslint-disable @typescript-eslint/no-floating-promises */

import { describe, it, assert, vi } from 'vitest';

import ImmediatePromise from 'engine/ImmediatePromise/ImmediatePromise';

describe('async function runtime', () => {
	it('returns an ordinary promise', () => {
		const returnValue = async function() {
			await 5;
		}();

		assert.strictEqual(returnValue instanceof Promise, true);
	});

	it('recognizes this', async () => {
		const that = { a: 1 };

		const value = await function(this: any) {
			return this.a;
		}.call(that);

		assert.strictEqual(value, that.a);
	});

	it('runs function directly', () => {
		let started = false;

		// intentionally not waiting on runAsync
		(async function() {
			started = true;
		})();

		assert.strictEqual(started, true);
	});

	it('inserts value of resolved promise', async () => {
		let value;

		await async function(this: any) {
			value = await Promise.resolve(1);
		}();
		assert.strictEqual(value, 1);
	});

	it('keeps operator precedence', async () => {
		// `*` has precedence between yield and await
		let value;

		await async function(this: any) {
			value = await Promise.resolve(3) * 5;
		}();
		assert.strictEqual(value, 15);
	});

	it('awaits for non promise values', async () => {
		let value;

		await async function(this: any) {
			value = await 1;
		}();
		assert.strictEqual(value, 1);
	});

	it('resolves non promise values async', async () => {
		const order: number[] = [];

		const promise = async function(this: any) {
			order.push(1);
			await 1;
			order.push(3);
		}();
		order.push(2);

		await promise;
		assert.deepStrictEqual(order, [1, 2, 3]);
	});

	it('does non throw when awaiting null', async () => {
		let value;

		await async function(this: any) {
			value = await null;
		}();
		assert.strictEqual(value, null);
	});

	it('does non throw when awaiting undefined', async () => {
		let value;

		await async function(this: any) {
			value = await undefined;
		}();
		assert.strictEqual(value, undefined);
	});

	it('works with multiple awaits', async () => {
		let value = 0;

		await async function(this: any) {
			value += await Promise.resolve(1);
			value += await Promise.resolve(1);
			value += await Promise.resolve(1);
		}();
		assert.strictEqual(value, 3);
	});

	it('throws error of rejected promise', async () => {
		const error = new Error();
		let catched;

		await async function(this: any) {
			try {
				await Promise.reject(error);
			} catch (e) {
				catched = e;
			}
		}();

		assert.strictEqual(catched, error);
	});

	describe('ImmediatePromise', () => {
		it('await gets resolved directly', async () => {
			let resolve;
			const a: number[] = [];

			const promise = async function(this: any) {
				await new ImmediatePromise((res) => {
					resolve = res;
				});
				a.push(2);
			}();

			a.push(1);
			resolve();
			a.push(3);

			await promise;
			assert.deepStrictEqual(a, [1, 2, 3]);
		});

		it('works with multiple awaits', async () => {
			let resolve1, resolve2, resolve3;
			const promise1 = new ImmediatePromise<number>((res) => resolve1 = res);
			const promise2 = new ImmediatePromise<number>((res) => resolve2 = res);
			const promise3 = new ImmediatePromise<number>((res) => resolve3 = res);
			let value = 0;

			const promise = async function(this: any) {
				value += await promise1;
				value += await promise2;
				value += await promise3;
			}();

			resolve1(1);
			resolve2(1);
			resolve3(1);

			await promise;
			assert.strictEqual(value, 3);
		});

		it('can return ImmediatePromise', async () => {
			let resolve;
			const immediatePromise = new ImmediatePromise((res) => resolve = res);

			const promise = async function(this: any) {
				return await immediatePromise.getOrdinaryPromise();
			}();

			resolve(1);
			assert.strictEqual(await promise, 1);
		});

		it('can return rejecting ImmediatePromise', async () => {
			const error = new Error();
			let reject, catched;
			const immediatePromise = new ImmediatePromise((_, rej) => reject = rej);

			const promise = async function(this: any) {
				return immediatePromise;
			}();

			reject(error);
			try {
				await promise;
			} catch (e) {
				catched = e;
			}
			assert.strictEqual(catched, error);
		});
	});

	it('resolves with returned value', async () => {
		const value = await async function(this: any) {
			await Promise.resolve(1);
			return 2;
		}();

		assert.strictEqual(value, 2);
	});

	it('unwraps returned value', async () => {
		const value = await async function(this: any) {
			return Promise.resolve(Promise.resolve(2));
		}();

		assert.strictEqual(value, 2);
	});

	it('rejectes on uncaught error', async () => {
		const error = new Error();
		let catched;

		try {
			await async function(this: any) {
				await Promise.reject(error);
			}();
		} catch (e) {
			catched = e;
		}

		assert.strictEqual(catched, error);
	});

	describe('for-await-of loops', () => {
		it('basic functionallity', async () => {
			const callback = vi.fn();

			await (async function() {
				for await (const i of [1, 2, 3].map(v => Promise.resolve(v))) {
					callback(i);
				}
			})();

			assert.deepStrictEqual(callback.mock.calls, [[1], [2], [3]]);
		});

		it('works without block', async () => {
			const callback = vi.fn();

			await (async function() {
				// @formatter-ignore
				for await (const i of [1, 2, 3])
					callback(i);
			})();

			assert.deepStrictEqual(callback.mock.calls, [[1], [2], [3]]);
		});

		it('works without variable declaration', async () => {
			const callback = vi.fn();

			await (async function() {
				let i;
				for await (i of [1, 2, 3]) {
					callback(i);
				}
			})();

			assert.deepStrictEqual(callback.mock.calls, [[1], [2], [3]]);
		});

		describe('destructuring', () => {
			it('object destructuring works', async () => {
				const callback = vi.fn();

				await (async function() {
					// @formatter-ignore
					for await (const { i } of [1, 2, 3].map(i => ({ i })))
						callback(i);
				})();

				assert.deepStrictEqual(callback.mock.calls, [[1], [2], [3]]);
			});

			it('array destructuring works', async () => {
				const callback = vi.fn();

				await (async function() {
					// @formatter-ignore
					for await (const [i] of [1, 2, 3].map(i => ([i])))
						callback(i);
				})();

				assert.deepStrictEqual(callback.mock.calls, [[1], [2], [3]]);
			});
		});

		it('nested loops work', async () => {
			const callback = vi.fn();

			await (async function() {
				for await (const i of [1, 2, 3]) {
					for await (const j of [1, 2, 3]) {
						callback(i, j);
					}
				}
			})();

			// @formatter-ignore
			assert.deepStrictEqual(callback.mock.calls, [
				[1, 1], [1, 2], [1, 3],
				[2, 1], [2, 2], [2, 3],
				[3, 1], [3, 2], [3, 3],
			]);
		});
	});
});
