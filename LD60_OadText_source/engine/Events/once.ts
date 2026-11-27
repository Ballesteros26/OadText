import ImmediatePromise from '../ImmediatePromise/ImmediatePromise';
import type EventEmitter from 'eventemitter3';
import { type EventEmitterLike, type getEventTypes } from './EventEmitterLike';
import type BaseEventEmitter from './BaseEventEmitter';

type Shift<T extends any[]> = T extends [v: any, ...(infer U)] ? U
	: [];

/**
 * Create an ImmediatePromise for the next event.
 */
export default function once<
	E extends EventEmitterLike,
	T extends EventEmitter.EventNames<getEventTypes<E>>,
	P extends EventEmitter.EventArgs<getEventTypes<E>, T>,
	V extends (...args: P) => boolean,
>(
	// declare this overload first to not display invalid calls as deprecated
	eventEmitter: Exclude<E, { get: BaseEventEmitter['get'] }>,
	event: T,
	predicate?: V,
): ImmediatePromise<{
	eventEmitter: E;
	event: T;
	value: (V extends (v: P[0], ...rest: Shift<P>) => v is infer U ? U : P[0]) & P[0];
}>;
/**
 * @deprecated Use `EventEmitter.prototype.get` instead
 */
export default function once<
	E extends EventEmitterLike,
	T extends EventEmitter.EventNames<getEventTypes<E>>,
	P extends EventEmitter.EventArgs<getEventTypes<E>, T>,
	V extends (...args: P) => boolean,
>(
	eventEmitter: E,
	event: T,
	predicate?: V,
): ImmediatePromise<{
	eventEmitter: E;
	event: T;
	value: (V extends (v: P[0], ...rest: Shift<P>) => v is infer U ? U : P[0]) & P[0];
}>;
export default function once<
	E extends EventEmitterLike,
	T extends EventEmitter.EventNames<getEventTypes<E>>,
	P extends EventEmitter.EventArgs<getEventTypes<E>, T>,
>(
	eventEmitter: E,
	event: T,
	predicate = (...args: P) => true,
) {
	return new ImmediatePromise<{
		eventEmitter: E;
		event: T;
		value: P[0];
	}>((res, _rej, onCleanup) => {
		const callback = (...args: P) => {
			if (predicate(...args)) {
				res({
					eventEmitter,
					event,
					value: args[0],
				});
			}
		};
		eventEmitter.on(event, callback);
		onCleanup(() => {
			eventEmitter.off(event, callback);
		});
	});
}

type getEventTypesPlus<E extends EventEmitterLike> = getEventTypes<E> & {
	// Typescript would allow arbitrary additional properties on `listeners`
	// if all other properties were defined (intended behavior of `Partial`)
	// Therefore we define an artificial property that will hopefully never
	// be set. Numbers won't show up in auto complete.
	[-123456789]: (x: never) => void;
};

/**
 * @deprecated use {@link once} inside a while loop instead
 */
export function on<
	E extends EventEmitterLike,
	Types extends getEventTypesPlus<E>,
	T extends EventEmitter.EventNames<Types>,
	L,
	H extends Partial<{
		[event in T]: (...args: EventEmitter.EventArgs<Types, event>) => L;
	}>,
	S extends ReturnType<Extract<H[keyof H], (...any) => any>>,
	R extends S extends void ? never : S,
>(
	eventEmitter: E,
	listeners:
		& H
		& {
			[event in T]: (...args: EventEmitter.EventArgs<Types, event>) => any;
		},
): Promise<R> {
	return new Promise((res) => {
		const registeredListeners = (Object.entries(listeners) as [string, (...args: any) => L][])
			.map(([event, listener]) =>
				[
					event,
					(...args) => {
						const result = listener(...args);
						if (result !== undefined) {
							registeredListeners.forEach(([name, listener]) => {
								eventEmitter.off(name, listener);
							});
							res(result as R);
						}
					},
				] as const
			);

		registeredListeners.forEach(([name, listener]) => {
			eventEmitter.on(name, listener);
		});
	});
}
