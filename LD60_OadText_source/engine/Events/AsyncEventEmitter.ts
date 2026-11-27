import type EventEmitter from 'eventemitter3';
import BaseEventEmitter from './BaseEventEmitter';

/**
 * A variation of {@link EventEmitter} that emits events asynchronously to
 * ensure handler on promises depending on the previous event already got
 * called.
 */
export default class AsyncEventEmitter<
	EventTypes extends EventEmitter.ValidEventTypes = string | symbol,
	Context extends any = any,
> extends BaseEventEmitter<EventTypes, Context> {
	private promise = Promise.resolve();

	emit<T extends EventEmitter.EventNames<EventTypes>>(
		event: T,
		...args: EventEmitter.EventArgs<EventTypes, T>
	): false {
		this.promise = this.promise.then(() => {
			super.emit(event, ...args);
		});

		return false;
	}
}
