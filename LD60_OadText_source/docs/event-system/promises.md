# Usage as Promises

Because of the way quack-engine is designed to utilize JavaScripts async syntax it is crucial to consume EventEmitters as Promises. This allows to await for a certain button press or some other kind of event.

Also, this allows more complex event handling like dragging to be written in a concise form:

```typescript
import once from 'engine/Events/once';

async function draggable(element) {
	const ee: EventEmitter = getEventEmitter(element);

	while (true) {
		const { value: startEvent } = await once(ee, 'pointerdown');
		startEvent.stopPropagation();
		// initialize dragging...
		let cancelled = false;
		while (!cancelled) {
			const data = await ImmediatePromise.race([
				once(ee, 'pointermove'),
				once(ee, 'pointerup'),
				once(ee, 'pointerupoutside'),
			]);
			switch (data.event) {
				case 'pointermove':
					// update position
					break;
				default:
					cancelled = true;
			}
		}
	}
}
```

In contrast, using EventEmitters directly often leads to more logic to keep track in which state we currently are. Another positive side effect is, that the handlers will automatically be removed.

## Gotchas

Though the await syntax has a lot of advantages there are some things to keep in mind:

1. Using EventEmitter instead of AsyncEventEmitter

   As described [here](/event-system/event-emitter#eventemitter-vs-asynceventemitter), using `EventEmitter` in the wrong situation can lead to events being lost. You should always create your EventEmitter in a way that they are compatible with promises.

2. Unconsciously delaying execution in async code

   Similarly to (1) you could miss events by accidentally delaying the registration of you listener, because even `AsyncEventEmitter` will only wait for promises **directly** depending on the previously emitted event to be resolved. Example code of where this happens are:

   ```typescript
   await once(ee, 'a', ...).getOrdinaryPromise(...);
   await once(ee, 'a', ...); // potentially missed 'a' event
   ```
   or also
   ```typescript
   await once(ee, 'a', ...);
   await Promise.resolve(1);
   await once(ee, 'a', ...); // potentially missed 'a' event
   ```

3. ~~Assuming predicates checked in callbacks still hold in subsequent code block~~

   ~~The callbacks of `once` and `on` are called synchronously when a appropriate event is emitted. But because of the asynchronous resolving of promises, code after an associated await statement will not be called immediately. Therefore other Code could have altered the state.~~

   ```typescript
   let a = 0;

   (async function() {
   	await once(ee, 'a', () => a == 0);
   	console.log(a); // prints 1
   })();

   ee.on('a', () => a = 1);
   ee.emit('a');
   ```

4. ~~Using Promise.race~~

   ~~Generally using `Promise.race` is not a problem. But you have to keep in mind that promises won't be cancelled automatically and therefore side effects could still happen~~

   ```typescript
   const a = once(ee, 'a', () => {/* (A) */});
   const b = once(ee, 'b', () => {/* (B) */});

   setTimeout(() => ee.emit('a'), 0);
   await Promise.race([a, b]);

   // (B) can still be executed
   ```

   ~~Also note that cancelling `b` after the emit block is still not enough, as a `'b'` event could be emitted before the cancellation gets executed. It is generally recommend to use `on` in these situations.~~
