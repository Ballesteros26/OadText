import type EventEmitter from 'eventemitter3';
import DerivedEventEmitter from '../DerivedEventEmitter';

type WithoutOn<T> = T extends `on${infer U}` ? U : never;

type toEventMap<T> = T extends Record<string, any> ? {
		[x in WithoutOn<keyof T>]: Parameters<T[`on${x}`]>[0];
	}
	: null;

type EventTypes<T> = null extends T ? string :
	& {
		[event in keyof T]: (event: T[event]) => void;
	}
	& {
		[event in keyof T as `${event & string}capture`]: (event: T[event]) => void;
	};

/**
 * Class to receive events through the {@link EventEmitter} interface instead of
 * using {@link EventTarget}'s `addEventListener` and `removeEventListener`.
 */
export default class EventTargetEventEmitter<U extends EventTarget>
	extends DerivedEventEmitter<EventTypes<toEventMap<U>>>
{
	private target: EventTarget;
	private controller = new AbortController();

	constructor(target: U) {
		super();
		this.target = target;
	}

	private getArguments(event: string) {
		if (!event.endsWith('capture')) {
			return [event, {
				capture: false,
				signal: this.controller.signal,
			}] as const;
		}
		const eventWithoutCapture = event.slice(0, -'capture'.length);

		return [eventWithoutCapture, {
			capture: !(`on${eventWithoutCapture}capture` in this.target),
			signal: this.controller.signal,
		}] as const;
	}

	protected registerHandler(
		event: EventEmitter.EventNames<EventTypes<toEventMap<U>>>,
		handler: (...args: any) => void,
	) {
		const [type, options] = this.getArguments(event as string);
		this.target.addEventListener(type, handler, options);
	}

	protected unregisterHandler(
		event: EventEmitter.EventNames<EventTypes<toEventMap<U>>>,
		handler: (...args: any) => void,
	) {
		const [type, options] = this.getArguments(event as string);
		this.target.removeEventListener(type, handler, options);
	}

	protected unregisterAllHandlers() {
		this.controller.abort();
		this.controller = new AbortController();
	}
}
