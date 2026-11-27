import type EventEmitter from 'eventemitter3';
import BaseEventEmitter from '../BaseEventEmitter';

type PromiseTypes<T> = {
	fullfilled(value: T): void;
	rejected(reason: any): void;
};

export default class PromiseEventEmitter<T> extends BaseEventEmitter<PromiseTypes<T>> {
	private settled = false;
	private throwOnAddListenerWhenSettled: boolean;

	/**
	 * Creates an `EventEmitter` emitting a `filfilled` event when the promise
	 * resolves or a `rejected` event when the promise gets rejected. This
	 * should only be used to combine the usage of event emitters and promises
	 * in functions designed for event emitters.
	 *
	 * Listeners assigned after the promise was settled will not be invoked.
	 * Consider creating a new instance with a derived promise of the original
	 * promise if this behavior is not desired.
	 *
	 * @param promise The promise
	 * @param throwOnAddListenerWhenSettled Whether adding a listener after the promise was settled should throw an error. If `false` it will still log a warning in dev build.
	 */
	constructor(
		promise: PromiseLike<T>,
		throwOnAddListenerWhenSettled = true,
	) {
		super();
		this.throwOnAddListenerWhenSettled = throwOnAddListenerWhenSettled;

		promise.then(
			value => {
				this.settled = true;
				this.emit('fullfilled', value);
			},
			reason => {
				this.settled = true;
				this.emit('rejected', reason);
			},
		);
	}

	private throwOrLogIfSettled() {
		if (!this.settled) {
			return;
		}
		if (this.throwOnAddListenerWhenSettled) {
			throw new Error(`Registered listener on PromiseEventEmitter after promise was resolved.
Set throwOnAddListenerWhenSettled to true if this is intended.`);
		} else if (__DEV__) {
			// There is no method to directly derive a new instance of the event
			// emitter to avoid keeping a reference to promise. Also because we
			// don't want to encourage the usage of PromiseEventEmitter.
			console
				.warn(`Registered listener on PromiseEventEmitter after promise was resolved. The listener will therefore not be called.
Consider creating a new instance with a derived promise of the original promise if this behavior is not desired.`);
		}
	}
	on<U extends keyof PromiseTypes<T>>(
		event: U,
		fn: EventEmitter.EventListener<PromiseTypes<T>, U>,
		context?: any,
	): this {
		this.throwOrLogIfSettled();
		return super.on(event, fn, context);
	}
	addListener<U extends keyof PromiseTypes<T>>(
		event: U,
		fn: EventEmitter.EventListener<PromiseTypes<T>, U>,
		context?: any,
	): this {
		this.throwOrLogIfSettled();
		return super.addListener(event, fn, context);
	}
	once<U extends keyof PromiseTypes<T>>(
		event: U,
		fn: EventEmitter.EventListener<PromiseTypes<T>, U>,
		context?: any,
	): this {
		this.throwOrLogIfSettled();
		return super.once(event, fn, context);
	}
}
