import { describe, it, assert, vi, expect } from 'vitest';

import once, { on } from 'engine/Events/once';
import AsyncEventEmitter from 'engine/Events/AsyncEventEmitter';
import EventEmitter from 'eventemitter3';
import createEmitterRef from 'engine/Events/Input/createEmitterRef';
import type { Sprite } from 'pixi.js';
import PromiseEventEmitter from 'engine/Events/Input/PromiseEventEmitter';
import EventTargetEventEmitter from 'engine/Events/Input/EventTargetEventEmitter';
import { merge } from 'engine/Events/utils';
import ImmediatePromise from 'engine/ImmediatePromise/ImmediatePromise';

describe('events', () => {
	describe('once', () => {
		it('returns instance of ImmediatePromise', () => {
			const ee = new EventEmitter();

			const promise = once(ee, 'a');

			assert.ok(promise instanceof ImmediatePromise);
		});

		it('resolves with value of event', async () => {
			const ee = new EventEmitter();

			const promise = once(ee, 'a').getOrdinaryPromise();

			ee.emit('a', 1);

			assert.strictEqual((await promise).value, 1);
		});

		it('resolves with eventemitter of event', async () => {
			const ee = new EventEmitter();

			const promise = once(ee, 'a').getOrdinaryPromise();

			ee.emit('a', 1);

			assert.strictEqual((await promise).eventEmitter, ee);
		});

		it('resolves with eventtype of event', async () => {
			const ee = new EventEmitter();

			const promise = once(ee, 'a').getOrdinaryPromise();

			ee.emit('a', 1);

			assert.strictEqual((await promise).event, 'a');
		});

		it('filters by predicate', async () => {
			const ee = new EventEmitter();

			const promise = once(ee, 'a', v => v > 2).getOrdinaryPromise();

			ee.emit('a', 1);
			ee.emit('a', 2);
			ee.emit('a', 3);

			assert.strictEqual((await promise).value, 3);
		});

		it('respects event type', async () => {
			const ee = new EventEmitter();

			const promise = once(ee, 'c').getOrdinaryPromise();

			ee.emit('a', 1);
			ee.emit('b', 2);
			ee.emit('c', 3);

			assert.strictEqual((await promise).value, 3);
		});

		it('clears callbacks', async () => {
			const ee = new EventEmitter();

			const promise = once(ee, 'a').getOrdinaryPromise();

			ee.emit('a', 1);

			await promise;

			assert.strictEqual(ee.listenerCount('a'), 0);
		});
	});

	describe('on', () => {
		type EventTypes = {
			a(value: string): void;
			b(value: number): void;
			c(): void;
		};

		it('works with untyped EventEmitter', () => {
			const ee = new EventEmitter();

			on(ee, {
				a() {
					return 3;
				},
			});
		});

		it('calls listeners synchronously', () => {
			const ee = new EventEmitter<EventTypes>();

			let value: any;
			on(ee, {
				a(v) {
					value = v;
				},
				b(v) {
					value = v;
				},
				c() {
					value = undefined;
				},
			});

			assert.strictEqual(value, undefined);
			ee.emit('a', 'abc');
			assert.strictEqual(value, 'abc');
			ee.emit('b', 123);
			assert.strictEqual(value, 123);
			ee.emit('c');
			assert.strictEqual(value, undefined);
		});

		it('resolves on return value', async () => {
			const ee = new EventEmitter<EventTypes>();

			const promise = on(ee, {
				a() {
					// noop
				},
				b(v) {
					return v;
				},
			});

			ee.emit('a', 'abc');
			ee.emit('b', 123);
			const value = await promise;

			assert.strictEqual(value, 123);
		});

		it('clears callbacks', async () => {
			const ee = new EventEmitter<EventTypes>();

			const promise = on(ee, {
				a() {
					return 'abc';
				},
			});

			ee.emit('a', 'abc');

			await promise;

			assert.strictEqual(ee.listenerCount('a'), 0);
		});

		it('keeps unrelated callbacks', async () => {
			const ee = new EventEmitter<EventTypes>();

			ee.on('a', () => {});

			const promise = on(ee, {
				a() {
					return 'abc';
				},
			});

			ee.emit('a', 'abc');

			await promise;

			assert.strictEqual(ee.listenerCount('a'), 1);
		});
	});

	describe('AsyncEventEmitter', () => {
		it('works with async functions', async () => {
			const ee = new AsyncEventEmitter();

			let a, b, c;
			async function test() {
				a = (await once(ee, 'a').getOrdinaryPromise()).value;
				b = (await once(ee, 'a').getOrdinaryPromise()).value;
				c = (await once(ee, 'a').getOrdinaryPromise()).value;
			}
			const promise = test();

			ee.emit('a', 1);
			ee.emit('a', 2);
			ee.emit('a', 3);

			await promise;

			assert.deepStrictEqual(a, 1);
			assert.deepStrictEqual(b, 2);
			assert.deepStrictEqual(c, 3);
		});
	});

	describe('createEmitterRef', () => {
		describe('typing', () => {
			it('keeps event types', () => {
				const ee = new EventEmitter<{
					mousedown(e: { preventDefault: () => void }): void;
				}>();
				const ref = createEmitterRef<typeof ee>();
				ref.on('mousedown', e => {
					e.preventDefault();
				});
			});

			it('works with untyped EventEmitter', () => {
				const ref = createEmitterRef();
				ref.on('string', () => {});
			});

			describe('works with unions', () => {
				it('works with typed union', () => {
					const ee1 = new EventEmitter<{
						mousedown(e: { preventDefault1: () => void }): void;
					}>();
					const ee2 = new EventEmitter<{
						mouseup(e: { preventDefault2: () => void }): void;
					}>();
					const ref = createEmitterRef<typeof ee1 | typeof ee2>();
					ref.on('mousedown', e => {
						e.preventDefault1();
					});
					ref.on('mouseup', e => {
						e.preventDefault2();
					});
				});

				it('works with partially types union', () => {
					const ee1 = new EventEmitter<{
						mousedown(e: { preventDefault: () => void }): void;
					}>();
					const ee2 = new EventEmitter();
					const ref = createEmitterRef<typeof ee1 | typeof ee2>();
					ref.on('mousedown', e => {
						e.preventDefault();
						e.anything();
					});
					ref.on('anything', e => {
						e.anything();
					});
				});
			});
		});

		it('current gets exposed', () => {
			const value = new EventEmitter() as Sprite;
			const ref = createEmitterRef<Sprite>();
			ref(value);
			ref.current?.alpha; // type is correct
			assert.strictEqual(ref.current, value);
		});

		describe('addListener works', () => {
			it('with non null current value', () => {
				const ee = new EventEmitter();
				const ref = createEmitterRef();
				ref(ee);

				const listener = vi.fn();
				ref.addListener('event', listener);
				ee.emit('event', 1);

				expect(listener).toHaveBeenCalledWith(1);
			});

			it('with null current value', () => {
				const ref = createEmitterRef();

				ref.addListener('event', () => {});
			});
		});

		describe('once works', () => {
			it('removes handler immediately', () => {
				const ee = new EventEmitter();
				const ref = createEmitterRef();
				ref(ee);

				const listener = vi.fn();
				ref.once('event', _v => {
					listener();
					assert.strictEqual(ref.listenerCount('event'), 0);
					assert.strictEqual(ee.listenerCount('event'), 0);
				});
				assert.strictEqual(ref.listenerCount('event'), 1);
				assert.strictEqual(ee.listenerCount('event'), 1);
				ee.emit('event', 1);

				expect(listener).toHaveBeenCalled();
			});
		});

		describe('removeListener works', () => {
			it('removes handler if no handler left', () => {
				const ref = createEmitterRef();
				const cb = () => {};
				ref.addListener('event', cb);

				ref.removeListener('event', cb);

				assert.strictEqual(ref.listenerCount('event'), 0);
			});

			it('keeps handler if handlers are left', () => {
				const ref = createEmitterRef();
				const cb = () => {};
				ref.addListener('event', cb);
				ref.addListener('event', () => {});

				ref.removeListener('event', cb);

				assert.strictEqual(ref.listenerCount('event'), 1);
			});

			it('unregisters only its own listeners', () => {
				const ee = new EventEmitter();
				const ref = createEmitterRef();
				const cb = () => {};

				const listener = vi.fn();
				ref(ee);
				ee.on('event', listener);
				ref.on('event', cb);
				ref.off('event', cb);

				ee.emit('event');
				assert.strictEqual(ee.listenerCount('event'), 1);
				expect(listener).toHaveBeenCalled();
			});

			it('with null current value', () => {
				const ref = createEmitterRef();
				const cb = () => {};

				ref.addListener('event', cb);
				ref.removeListener('event', cb);
			});
		});

		describe('current changes', () => {
			it('registers listeners if current gets set', () => {
				const ee = new EventEmitter();
				const ref = createEmitterRef();

				ref.on('event', () => {});
				ref(ee);

				assert.strictEqual(ee.listenerCount('event'), 1);
			});

			it('unregisters listeners if current gets set', () => {
				const ee = new EventEmitter();
				const ref = createEmitterRef();

				ref(ee);
				ref.on('event', () => {});

				ref(null);
				assert.strictEqual(ee.listenerCount('event'), 0);
			});

			it('unregisters only its own listeners', () => {
				const ee = new EventEmitter();
				const ref = createEmitterRef();

				const listener1 = vi.fn();
				const listener2 = vi.fn();
				ref(ee);
				ee.on('event', listener1);
				ref.on('event', listener2);
				ref(null);

				ee.emit('event');
				assert.strictEqual(ee.listenerCount('event'), 1);
				expect(listener1).toHaveBeenCalled();
				expect(listener2).not.toHaveBeenCalled();
			});
		});

		describe('emit works on emitter itself', () => {
			it('with non null current value', () => {
				const ee = new EventEmitter();
				const ref = createEmitterRef();

				const listener1 = vi.fn();
				const listener2 = vi.fn();
				ref(ee);
				ee.on('event', listener1);
				ref.on('event', listener2);
				ref.emit('event', 1);

				expect(listener1).not.toHaveBeenCalled();
				expect(listener2).toHaveBeenCalledWith(1);
			});

			it('with null current value', () => {
				const ref = createEmitterRef();
				const listener = vi.fn();

				ref.on('event', listener);
				ref.emit('event', 1);

				expect(listener).toHaveBeenCalledWith(1);
			});
		});
	});

	describe('EventTargetEventEmitter', () => {
		describe('typing', () => {
			it('works with type any', () => {
				const ee = new EventTargetEventEmitter(window as any);
				ee.on('something', (_a, _b, _c) => {});
			});

			it('works with predefined EventTarget', () => {
				const ee = new EventTargetEventEmitter(window);
				ee.on('keydown', (_e) => {});
			});

			it('has capture event', () => {
				const ee = new EventTargetEventEmitter(window);
				ee.on('keydowncapture', (_e) => {});
			});
		});
	});

	describe('PromiseEventEmitter', () => {
		describe('basic functionality', () => {
			it('emits fulfilled', async () => {
				const promise = Promise.resolve(1);
				const ee = new PromiseEventEmitter(promise);

				const listener = vi.fn();
				ee.on('fullfilled', listener);
				await promise;

				expect(listener).toHaveBeenCalledWith(1);
			});

			it('emits rejected', async () => {
				const promise = Promise.reject(1);
				const ee = new PromiseEventEmitter(promise);

				const listener = vi.fn();
				ee.on('rejected', listener);
				await promise.catch(() => null);

				expect(listener).toHaveBeenCalledWith(1);
			});
		});

		describe('error on addListener', () => {
			it('on throws when promise is resolved', async () => {
				const promise = Promise.resolve(1);
				const ee = new PromiseEventEmitter(promise);
				await promise.then(() => {
					assert.throws(() => {
						ee.on('fullfilled', () => {});
					});
				});
			});

			it('on throws emit got called', async () => {
				const promise = Promise.resolve(1);
				const ee = new PromiseEventEmitter(promise);

				const listener = vi.fn();
				let errorThrown = false;
				ee.on('fullfilled', () => {
					try {
						ee.on('fullfilled', listener);
					} catch {
						errorThrown = true;
					}
				});
				await promise;
				await new Promise(res => setTimeout(res, 0));

				expect(listener).not.toHaveBeenCalled();
				assert.strictEqual(errorThrown, true);
			});
		});
	});

	describe('utils', () => {
		describe('merge', () => {
			// it('typing', () => {
			// 	let ee = merge({
			// 		abc: new EventEmitter<{
			// 			a(a: string): void;
			// 		}>(),
			// 		def: new EventEmitter<{
			// 			b(): void;
			// 			c(v: string): void;
			// 		}>(),
			// 		// promise: new PromiseEventEmitter(new Promise<number>(() => {})),
			// 		any: {} as any,
			// 		button: new EventTargetEventEmitter(new HTMLButtonElement()),
			// 	});

			// 	ee.on('abc.a', () => {});
			// 	ee.on('def.b', () => {});
			// 	ee.on('def.c', () => {});
			// 	ee.on('any.something', () => {});
			// 	// ee.on('promise.fullfilled', () => {});
			// 	ee.on('button.click', () => {});
			// });

			it('basic functionality', () => {
				const a = new EventEmitter();
				const ee = merge({
					a,
				});
				const listener = vi.fn();
				ee.on('a.b', listener);
				a.emit('b', 1);
				expect(listener).toHaveBeenCalledWith(1);
			});

			it('unregisterAllHandlers works', () => {
				const a = new EventEmitter();
				const ee = merge({
					a,
				});
				const listener = vi.fn();
				ee.on('a.b', listener);
				ee.removeAllListeners();
				a.emit('b', 1);
				expect(listener).not.toHaveBeenCalled();
			});

			it('throws if key contains `.`', () => {
				assert.throws(() => {
					merge({
						'a.a': new EventEmitter(),
					});
				});
			});

			it('throws on invalid event type', () => {
				const ee = merge({
					a: new EventEmitter(),
				});
				assert.throws(() => {
					ee.on('a' as any, () => {});
				});
			});

			it('throws if key is not present', () => {
				const ee = merge({
					a: new EventEmitter(),
				});
				assert.throws(() => {
					ee.on('b' as any, () => {});
				});
			});
		});
	});
});
