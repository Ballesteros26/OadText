# Hot Module Replacement

To archive faster development time [hot module replacement](https://webpack.js.org/concepts/hot-module-replacement)
was implemented.

The update logic is implemented by the dedicated loaders. As an example, images get replaced by swapping the texture of the corresponding asset.

In contrast, replacing code is more involved. At the time of writing typescript code gets updated by replacing the prototypes of class instances.

## Prototype replacement

### How classes get replaced

Given a class `A` and its matched replacement `B`, the prototypes of all current and later existing instances of `A` will be replaced by the prototype of `B`.

Technically this is implemented by wrapping all classes by classes whose prototype chains will be manipulated to point to the prototype of the new updated classes.

### Which classes will be updated?

Only classes at the _top level scope_ of a module written as _class declaration_ will be updated. All other classes are considered to be dynamic and therefore not considered for hot module replacement.

```typescript
// considered for HMR
class A {
	private a: number;
	constructor(a: number) {
		this.a = a;
	}
}
function () {
	// not considered: not at top level scope
	class B {
		// ...
	}
}
// not considered: no class declaration
const C = class {
	// ...
}
```

### How classes get assigned to each other

Given the source code of a module and the code of its successor there is not definite way to match the classes of the successor module to the ones from the original module. One could think of arbitrarily complex methods to match them but we choose a simple, therefore predictable and cheap approach:

1. Only consider matching a class with one class declaration of the **direct** predecessor
2. Given a class declaration with a name: If one if the considered classes share the same name match them
3. Otherwise: If (2) was not applicable, the class declaration is the default export and the previous module had a default export match them
