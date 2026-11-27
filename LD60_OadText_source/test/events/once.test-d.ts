import { it, expectTypeOf, describe } from 'vitest';

import once from 'engine/Events/once';
import type EventEmitter from 'eventemitter3';
import KeyboardEventEmitter from 'engine/Events/Input/KeyboardEventEmitter';
import { type Body, World, type Fixture } from 'planck';
import { Sprite, type FederatedEvent, type DisplayObject } from 'pixi.js';
import createEmitterRef from 'engine/Events/Input/createEmitterRef';
import AsyncEventEmitter from 'engine/Events/AsyncEventEmitter';

// TODO let tests fail on ts error

describe.skip('typing', async () => {
	describe('explicitly typed EventEmitter', () => {
		it('typing by methods', async () => {
			const ee: EventEmitter<{
				a(value: string): void;
				b(value: number): void;
			}> = null as any;

			const { value: string } = await once(ee, 'a');
			expectTypeOf(string).not.toBeAny();
			expectTypeOf(string).toMatchTypeOf<string>();

			const { value: number } = await once(ee, 'b');
			expectTypeOf(number).not.toBeAny();
			expectTypeOf(number).toMatchTypeOf<number>();
		});
		it('typing by array', async () => {
			const ee: EventEmitter<{
				a: [value: string];
				b: [value: number];
			}> = null as any;

			const { value: string } = await once(ee, 'a');
			expectTypeOf(string).not.toBeAny();
			expectTypeOf(string).toMatchTypeOf<string>();

			const { value: number } = await once(ee, 'b');
			expectTypeOf(number).not.toBeAny();
			expectTypeOf(number).toMatchTypeOf<number>();
		});
		it('utilizes type predicates', async () => {
			const ee: EventEmitter<{
				a(value: 'A' | 'B'): void;
			}> = null as any;

			const { value: string1 } = await once(ee, 'a', (v) => v === 'A');
			expectTypeOf(string1).not.toBeAny();
			expectTypeOf(string1).toMatchTypeOf<'A'>();

			const { value: string2 } = await once(ee, 'a', () => true);
			expectTypeOf(string2).not.toBeAny();
			expectTypeOf(string2).toMatchTypeOf<'A' | 'B'>();
		});
	});
	it('KeyboardEventEmitter', async () => {
		const keyboard = new KeyboardEventEmitter();

		const { value } = await once(keyboard, 'keydown');
		expectTypeOf(value).not.toBeAny();

		const { value: value2 } = await keyboard.get('keydown');
		expectTypeOf(value2).not.toBeAny();
	});
	it('pixi', async () => {
		const sprite = new Sprite();

		// pixi.js allows arbitrary events
		const { value: any } = await once(sprite, 'invalid-event');
		expectTypeOf(any).toBeAny();

		const { value: event } = await once(sprite, 'mousedown');
		expectTypeOf(event).not.toBeAny();
		expectTypeOf(event).toMatchTypeOf<FederatedEvent>();

		const { value: object } = await once(sprite, 'added');
		expectTypeOf(object).not.toBeAny();
		expectTypeOf(object).toMatchTypeOf<DisplayObject>();
	});
	it('pixi-react', async () => {
		const ref = createEmitterRef<Sprite>();

		// pixi.js allows arbitrary events
		const { value: any } = await once(ref, 'invalid-event');
		expectTypeOf(any).toBeAny();

		const { value: event } = await once(ref, 'mousedown');
		// @ts-expect-error not supported
		expectTypeOf(event).not.toBeAny();
		expectTypeOf(event).toMatchTypeOf<FederatedEvent>();

		const { value: object } = await once(ref, 'added');
		// @ts-expect-error not supported
		expectTypeOf(object).not.toBeAny();
		expectTypeOf(object).toMatchTypeOf<DisplayObject>();

		const { value: event2 } = await ref.get('mousedown');
		expectTypeOf(event2).not.toBeAny();
		expectTypeOf(event2).toMatchTypeOf<FederatedEvent>();
	});
	it('AsyncEventEmitter', async () => {
		const ee = new AsyncEventEmitter<{
			a: [value: string];
			b: [value: number];
		}>();

		const { value: string } = await once(ee, 'a');
		expectTypeOf(string).not.toBeAny();
		// @ts-expect-error once mixes possible event values
		expectTypeOf(string).toMatchTypeOf<string>();

		const { value: string2 } = await ee.get('a', (_e) => true);
		expectTypeOf(string2).not.toBeAny();
		expectTypeOf(string2).toMatchTypeOf<string>();
	});
	it('planck', async () => {
		const world = new World();

		// @ts-expect-error detects invalid event types
		await once(world, 'invalid-event');

		const { value: body } = await once(world, 'remove-body');
		expectTypeOf(body).not.toBeAny();
		expectTypeOf(body).toMatchTypeOf<Body>();

		const { value: fixture } = await once(world, 'remove-fixture');
		expectTypeOf(fixture).not.toBeAny();
		expectTypeOf(fixture).toMatchTypeOf<Fixture>();
	});
});
