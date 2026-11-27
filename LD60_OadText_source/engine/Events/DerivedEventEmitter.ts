import type EventEmitter from 'eventemitter3';
import BaseEventEmitter from './BaseEventEmitter';

/**
 * Helper class to create {@link EventEmitter}s deduced from other event
 * mechanisms by automatically registering handlers using `registerHandler` once
 * a listener is added. It also unregisters handlers once there are no more
 * listeners attached to an event type.
 */
export default abstract class DerivedEventEmitter<
	EventTypes extends EventEmitter.ValidEventTypes = string | symbol,
	Context extends any = any,
> extends BaseEventEmitter<EventTypes, Context> {
	protected handlers: Map<
		EventEmitter.EventNames<EventTypes>,
		(...args: Parameters<EventEmitter.EventListener<EventTypes, EventEmitter.EventNames<EventTypes>>>) => boolean
	> = new Map();

	protected abstract registerHandler(
		event: EventEmitter.EventNames<EventTypes>,
		handler: (...args: any) => void,
	);
	protected abstract unregisterHandler(
		event: EventEmitter.EventNames<EventTypes>,
		handler: (...args: any) => void,
	);
	// We could provide a default implementation using unregisterHandler but in
	// most cases there is a more efficient way.
	protected abstract unregisterAllHandlers();

	on<T extends EventEmitter.EventNames<EventTypes>>(
		event: T,
		fn: EventEmitter.EventListener<EventTypes, T>,
		context?: any,
	): this {
		return this.addListener(event, fn, context);
	}
	addListener<T extends EventEmitter.EventNames<EventTypes>>(
		event: T,
		fn: EventEmitter.EventListener<EventTypes, T>,
		context?: any,
	): this {
		if (!this.handlers.has(event)) {
			const handler = this.emit.bind(this, event);
			this.handlers.set(event, handler);
			this.registerHandler(event, handler);
		}
		return super.addListener(event, fn, context);
	}
	once<T extends EventEmitter.EventNames<EventTypes>>(
		event: T,
		fn: EventEmitter.EventListener<EventTypes, T>,
		context?: any,
	): this {
		if (!this.handlers.has(event)) {
			const handler = this.emit.bind(this, event);
			this.handlers.set(event, handler);
			this.registerHandler(event, handler);
		}
		return super.once(event, fn, context);
	}
	private unregisterHandlerIfEmpty(event: EventEmitter.EventNames<EventTypes>) {
		if (this.listenerCount(event) === 0 && this.handlers.has(event)) {
			const handler = this.handlers.get(event)!;
			this.unregisterHandler(event, handler);
			this.handlers.delete(event);
		}
	}
	removeListener<T extends EventEmitter.EventNames<EventTypes>>(
		event: T,
		fn?: EventEmitter.EventListener<EventTypes, T>,
		context?: any,
		once?: boolean,
	): this {
		super.removeListener(event, fn, context, once);
		this.unregisterHandlerIfEmpty(event);
		return this;
	}
	off<T extends EventEmitter.EventNames<EventTypes>>(
		event: T,
		fn?: EventEmitter.EventListener<EventTypes, T>,
		context?: any,
		once?: boolean,
	): this {
		return this.removeListener(event, fn, context, once);
	}
	removeAllListeners(event?: EventEmitter.EventNames<EventTypes>): this {
		super.removeAllListeners(event);
		if (event == null) {
			this.unregisterAllHandlers();
			this.handlers.clear();
		} else {
			this.unregisterHandlerIfEmpty(event);
		}
		return this;
	}
}
