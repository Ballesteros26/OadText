// must be imported before Main, otherwise blurry images in production build
import 'engine/View/pixi/pixiSettings';

import type Game from 'engine/Game/Game';
import Main from './Main';
import { createPixiReactStage } from 'engine/View/pixi/PixiReactStage';
import Process from 'engine/Process/Process';

export default async (game: Game) => {
	const renderer = await createPixiReactStage(document.body);

	return game.createProcess(
		WithRender<InstanceType<typeof Main>, number>,
		create => create(Main),
		process => renderer.render(process.View),
		() => renderer.destroy(),
	);
};

class WithRender<V extends Process<T>, T> extends Process<T> {
	private child: V;
	constructor(
		createChild: (createProcess: <U extends any[]>(
			constructor: { new (...args: U): V },
			...args: U
		) => V) => V,
		private render: (child: V) => void,
		destroy: () => void,
	) {
		super();
		this.child = createChild((...args) => this.createProcess(...args));

		this.getPromise().finally(destroy);
	}
	protected run() {
		return this.child.getPromise();
	}
	protected frame(): void {
		this.render(this.child);
	}
}
