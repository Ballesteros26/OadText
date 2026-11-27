# Cancellation of Async Functions

One hurdle to use async functions in many places is not being able to easily stop the execution of async functions once they are running.

## Cancellation API

To cancel the execution of async functions you use `cancelContext`. The function receives an object and cancelles _all_ async functions that run with this object as context. Also all async functions called in the future with the same context will be cancelled immediately.

```typescript twoslash
import { cancelContext } from 'engine/Runtime/cancellation';

const context = {};
const promise = new Promise(() => {});

(async function() {
	await promise;
}).call(context);

cancelContext(context);
```

The promise you are currently awaiting will not get cancelled though. Therefore all side effects should be inside the async function body, not the promises themself.

Note that when returning the promise directly the function can't be cancelled.

## Cancellation of awaited `ImmediatePromise`s

In contrast to ordinary promises, instances of `ImmediatePromise` can be cancelled using `ImmediatePromise.prototype.cancel`. When an async function gets cancelled, the derived promises of the currently awaited promise get cancelled. If these are the only listeners on the awaited promise, the awaited promise itself gets cancelled.

## How it works

Async functions are transformed into generator functions that are wrapped with `runAsync`. When an async function gets cancelled `.return` is called on the generator and the corresponding promise gets rejected with a `CancellationError`.

Finally blocks will still be executed and await values, but _can't_ alter the return value of the promise and won't delay the settling of the promise.

Normally calling `.return` on a generator that is suspended inside a finally block will skip the finally block. To ensure all finally blocks gets executed, the generator function will additionally be enclosed with `lockReturnCalls` if there is a finally block containing awaits.

```typescript
function() {
	return runAsync(function* () {
		return yield* lockReturnCalls(__locker => function* () {
			try {
				let a = yield promise;
			}
			finally {
				// <generated>
				// don't call `.return` while in a finally block
				__locker.lock();
				try {
				// </generated>
					yield promise;
				// <generated>
				}
				catch (e) {
					throw e;
				}
				finally {
					__locker.unlock();
					// call `.return` if the generator was cancelled
					yield continueWithLastYieldToken;
				}
				// <generated>
			}
		}, this);
	}, this);
}
```
