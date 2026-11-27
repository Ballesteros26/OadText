import type EventEmitter from 'eventemitter3';
import { type Container, type ContainerEvents } from 'pixi.js';

export interface EventEmitterLike {
	/**
	 * Add a listener for a given event.
	 */
	on(event: string | symbol, fn: (...args: any) => any): any;

	/**
	 * Remove the listeners of a given event.
	 */
	off(event: string | symbol, fn: (...args: any) => any): any;
}

type enhanceEventEmitterInformation<T extends EventEmitter, U extends string | symbol> = {
	[P in U]: T extends { on(event: P, cb: infer Params): void } ? Params
		: never;
};

export type getEventTypes<T extends EventEmitterLike> = T extends Container<infer U> ? ContainerEvents<U>
	: T extends EventEmitter<infer U extends object> ? U
	// T is EventEmitter but we only get event names infered
	: T extends EventEmitter<infer U extends string | symbol> ? enhanceEventEmitterInformation<T, U>
	// use types of `off` as adding a listener that can't be removed would
	// lead to more subtile bugs.
	: T extends { off: infer V } ? FromEntries<OverloadedParametersType<V>>
	: never;

type OverloadedParametersType<T> = T extends {
	(...args: infer P1): any;
	(...args: infer P2): any;
	(...args: infer P3): any;
	(...args: infer P4): any;
	(...args: infer P5): any;
	(...args: infer P6): any;
	(...args: infer P7): any;
	(...args: infer P8): any;
} ? [P1 | P2 | P3 | P4 | P5 | P6 | P7 | P8] :
	any;

// from https://dev.to/svehla/typescript-object-fromentries-389c
type ArrayElement<A> = A extends readonly (infer T)[] ? T : never;
type Cast<X, Y> = X extends Y ? X : Y;
type FromEntries<T> = T extends [infer Key, any][] ? { [K in Cast<Key, string>]: Extract<ArrayElement<T>, [K, any]>[1] }
	: { [key in string]: any };
