import type EventEmitter from 'eventemitter3';
import { type EventEmitterLike, type getEventTypes } from '../EventEmitterLike';
import DerivedEventEmitter from '../DerivedEventEmitter';

/**
 * Mimics {@link React.createRef} but also acts as an {@link EventEmitter} on
 * the current element at the same time. When the value of `current` changes the
 * listeners of this emitter will be removed from the previous value and
 * reattached to the new value of `current`.
 *
 * Useful in conjunction with @pixi/react:
 * ```
 * class {
 *   ref = createEmitterRef<PIXI.Sprite>();
 *   render() {
 *     return <Sprite
 *       eventMode='static'
 *       ref={this.ref}
 *       texture={image.texture}
 *     />
 *   }
 * }
 * ```
 */
export default function createEmitterRef<T extends EventEmitterLike = EventEmitter>() {
	const originalRef = (current: T | null) => {
		eventEmitter.current = current;
	};

	const eventEmitter = new RefEmitter<T>();

	return new Proxy(originalRef, {
		get: function(target, propertyKey: string, receiver) {
			return Reflect.get(eventEmitter, propertyKey, receiver);
		},
		set: function(target, propertyKey: string, value: any, receiver) {
			return Reflect.set(eventEmitter, propertyKey, value, receiver);
		},
	}) as typeof originalRef & typeof eventEmitter;
}

class RefEmitter<
	T extends EventEmitterLike,
	Types extends EventEmitter.ValidEventTypes = getEventTypes<T>,
> extends DerivedEventEmitter<Types> {
	private _current: T | null = null;

	set current(current: T | null) {
		for (const [event, handler] of this.handlers.entries()) {
			this._current?.off(event, handler);
			current?.on(event, handler);
		}
		this._current = current;
	}
	get current() {
		return this._current;
	}

	protected registerHandler(
		event: EventEmitter.EventNames<Types>,
		handler: EventEmitter.EventListener<Types, EventEmitter.EventNames<Types>>,
	) {
		this._current?.on(event, handler);
	}
	protected unregisterHandler(
		event: EventEmitter.EventNames<Types>,
		handler: EventEmitter.EventListener<Types, EventEmitter.EventNames<Types>>,
	) {
		this._current?.off(event, handler);
	}
	protected unregisterAllHandlers() {
		if (this._current) {
			for (const [event, handler] of this.handlers.entries()) {
				this._current.off(event, handler);
			}
		}
	}
}
