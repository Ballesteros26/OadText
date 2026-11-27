# EventEmitter

EventEmitters form the foundation of our event system.

## Why EventEmitter?

To create an event system we had to choose a common ground to consume events. This common ground became [EventEmitter](https://github.com/primus/EventEmitter3) because

1. Pixi.js uses EventEmitter
2. Native events can be naturally modelled using EventEmitters
3. Straightforward event type handling
4. Easy API
5. Small bundle size

The initial focus was on making the system work well with promises. But if you may want to model events another way in the future (e.g. Observables, Streams, ...), you could do so by providing ways to turn EventEmitters into your desired model. You would have to do this anyways as Pixi.js uses them.

## EventEmitter vs. AsyncEventEmitter

Because promises don't call their callbacks synchronously you can run into problems when using EventEmitters in conjunction with Promises. Consider the following example:

```typescript
const ee = new EventEmitter();

async function run() {
	while (true) {
		console.log(await new Promise((res) => {
			ee.once('event', res);
		}));
	}
}
run();

ee.emit('event', 1);
ee.emit('event', 2);
```

The given code will only print `1`! This happens because async code does not continue synchronously after a promise got resolved. Therefore, when the second event gets emitted the async function hasn't proceeded yet, in particular did not create the second promise. It didn't even have logged `1` yet.

To solve this issue `ImmediatePromise` and `AsyncEventEmitter` were introduced. In contrast to Promises `ImmediatePromise` runs their callbacks synchronously. Note that for this to work with async functions there is a [runtime modification](/runtime-modifications/async-functions) necessary. On the other hand `AsyncEventEmitter` postpones emitting an event until all promises depending on the previously emitted event called their associated callbacks. There are still some things to conside though, [see here](/event-system/promises#gotchas).

For DOM events one should still use `EventEmitter` as it intoduces less overhead and the upper problem can not occur here, because DOM events are guaranteed to run in their own macro task. Also, this allows to still call methods like `preventDefault()` on events (this would not work with `AsyncEventEmitter`).
