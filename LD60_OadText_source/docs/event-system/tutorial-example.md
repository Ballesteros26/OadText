# Example: Tutorial System

There is no built system for tutorial in our engine. But using an EventEmitter
as dispatcher works nicely together with declarative rendering to create a
tutorial system with little boilerplate.

Note: You are not forced to declare a tutorial as class, though it is
recommended to use [hot module replacement](/build-setup/hmr). Also, in a lot of cases it
can be useful to derive `Tutorial` from `Process`. Just remember to add tutorial
as a child of another process.

```tsx
// Tutorial.js
import { Text } from '@pixi/react';
import { TextStyle } from 'pixi.js';
import once from 'engine/Events/once';
import AsyncEventEmitter from 'engine/Events/AsyncEventEmitter';

const ee = new AsyncEventEmitter<{
	ok: () => void;
}>();
export const dispatch = ee.emit.bind(ee) as typeof ee.emit;

export class Tutorial {
	private showModal = true;

	constructor() {
		this.run();
	}
	async run() {
		await once(ee, 'ok');
		this.showModal = false;
	}
	public modalHook() {
		const style = new TextStyle({ fill: ['#ffffff'] });
		return this.showModal &&
			(
				<pixiText
					x={50}
					y={100}
					text={'Placeholder'}
					style={style}
				/>
			);
	}
}
export const tutorial = new Tutorial();
```

Generally all non tutorial processes should dispatch all event that could be
relevant for the tutorial. The tutorial is responsible to filter the events
using the predicate parameter.
