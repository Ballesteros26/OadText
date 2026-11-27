import type EventEmitter from 'eventemitter3';
import DerivedEventEmitter from './DerivedEventEmitter';

type prefixEventTypes<T, prefix extends string> = T extends EventEmitter<infer U> ? {
		[x in `${prefix}.${U extends string ? U : keyof U & string}`]: never;
	}
	: `${prefix}.${string}`;

type prefixMapEntries<T> = {
	[x in keyof T]: prefixEventTypes<T[x], x & string>;
};

type flatTypes<T> = prefixMapEntries<T>[keyof prefixMapEntries<T>];

class MergedEventEmitter<T extends Record<string, EventEmitter<any>>> extends DerivedEventEmitter<flatTypes<T>> {
	private map: T;

	constructor(map: T) {
		super();
		this.map = {
			...map,
		};
	}

	private getEventEmitterAndEvent(keyEvent: EventEmitter.EventNames<flatTypes<T>>) {
		const [key, event] = (keyEvent as string).split(/[.](.+)/);
		const ee = this.map[key];
		if (event == null) {
			throw new Error('Event types on MergedEventEmitter must contain a `.`');
		}
		if (ee == null) {
			throw new Error(`\`${key}\` is not present in MergedEventEmitter`);
		}
		return [ee, event] as const;
	}
	protected registerHandler(keyEvent: EventEmitter.EventNames<flatTypes<T>>, handler: (...args: any) => void) {
		const [ee, event] = this.getEventEmitterAndEvent(keyEvent);
		ee.on(event, handler);
	}
	protected unregisterHandler(keyEvent: EventEmitter.EventNames<flatTypes<T>>, handler: (...args: any) => void) {
		const [ee, event] = this.getEventEmitterAndEvent(keyEvent);
		ee.off(event, handler);
	}
	protected unregisterAllHandlers() {
		for (const [event, handler] of this.handlers) {
			this.unregisterHandler(event, handler);
		}
	}
}

/**
 * Combine multiple {@link EventEmitter}s into one.
 * ```
 * const ee = merge({
 *   keyboard: new EventEmitter<{ keydown(e: KeyboardEvent): void }>(),
 *   window: new EventEmitter<{ blur(): void }>(),
 * });
 *
 * ee.on('keyboard.keydown', (e) => { });
 * ```
 *
 * @param map The mapping from string to {@link EventEmitter}
 * @returns The merged {@link MergedEventEmitter}
 */
export function merge<T extends Record<string, EventEmitter<any>>>(map: T) {
	// validate object
	if (Object.keys(map).some(e => e.includes('.'))) {
		throw new Error('Keys must not contain a `.`');
	}
	return new MergedEventEmitter(map);
}
