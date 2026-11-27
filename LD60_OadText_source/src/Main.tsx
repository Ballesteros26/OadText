/// gfdf<reference no-default-lib="true"/>
//https://github.com/Microsoft/TypeScript-Handbook/blob/master/pages/Triple-Slash%20Directives.md

import Process from 'engine/Process/Process';
import { component } from 'engine/View/Decorators';

import type Host from './Host';
import type Mobile from './Mobile';

export default class Main extends Process<number> /* extends FixedStepProcess<Number>*/ {
	private scene: Host | Mobile | null = null;

	constructor() {
		super();

		const roomId = new URLSearchParams(window.location.search).get('id');

		const constructr = roomId ? import('./Mobile') : import('./Host');
		// @ts-expect-error
		constructr.then(c => {
			this.scene = this.createProcess(c.default, roomId);
		});
	}

	@component()
	public View({ width, height }: { width: number; height: number }) {
		if (this.scene == null) {
			return;
		}
		return <this.scene.View width={width} height={height} />;
	}
}
