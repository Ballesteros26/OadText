import EventEmitter from 'eventemitter3';
import once from './once';

export default class BaseEventEmitter<
	EventTypes extends EventEmitter.ValidEventTypes = string | symbol,
	Context extends any = any,
> extends EventEmitter<EventTypes, Context> {
	/**
	 * Wrapper around {@link once} for better type inference.
	 */
	get<
		T extends EventEmitter.EventNames<EventTypes>,
		P extends EventEmitter.EventArgs<EventTypes, T>,
		V extends (...args: P) => boolean,
	>(
		event: T,
		predicate?: V,
	) {
		return once<EventEmitter, T, P, V>(this as EventEmitter, event, predicate);
	}
}
