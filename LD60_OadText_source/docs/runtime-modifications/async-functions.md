# ImmediatePromise in Async Functions

In order to be able to properly use `ImmediatePromise`s without providing additional APIs, async functions will execute awaits on `ImmediatePromise`s immediately when they are resolved. Take a look at the following code:

```typescript
let resolve;
const promise = new ImmediatePromise(res => resolve = res);

async function run() {
	console.log(await promise);
}
run();

console.log(1);
resolve(2);
console.log(3);
```

With the modifications applied this code will print `1, 2, 3`. Without the modification this code will throw! It would have to be rewritten as:

```typescript
/* same as above */

setTimeout(() => {
	console.log(1);
	resolve(2);
	console.log(3);
}, 0);
```

The reason for that is that `await promise` will call `promise.then` asynchronously, in this case when the `ImmediatePromise` is already resolved. But even when the code is adapted it will print `1, 3, 2`. This could potentially lead to events accidentally being skipped.

Note that all async functions are still returning only ordinary promises. `ImmediatePromise`s are only meant to be used inside of small scopes.
