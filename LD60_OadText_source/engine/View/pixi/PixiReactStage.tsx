import { DEBUGGER_MODE, offerScreenshot } from '../../devHooks';

import { type Application } from 'pixi.js';
import { Component, StrictMode, type ReactNode } from 'react';
import { createRoot } from '@pixi/react';

// We have to use a global variable because local state leads to some edge cases
// because of our improper usage of react.
let hasError = false;
import.meta.hot?.on('vite:afterUpdate', () => {
	hasError = false;
});
class ErrorBoundary extends Component<{ children: React.ReactElement }> {
	static getDerivedStateFromError(e) {
		hasError = true;
		setTimeout(() => {
			throw e;
		}, 0);
		// gracefully return to avoid retrys from react
		return {};
	}
	render() {
		if (hasError) {
			return <></>;
		}
		return this.props.children;
	}
}

export async function createPixiReactStage(target: HTMLElement) {
	const canvas = document.createElement('canvas');
	canvas.style.position = 'fixed';
	target.appendChild(canvas);

	const root = createRoot(canvas);

	// calls app.initalize
	await root.render(null, {
		autoStart: false,
		antialias: false,

		resizeTo: target,
	});

	return new PixiReactStage(root);
}

type Root = ReturnType<typeof createRoot>;

class PixiReactStage {
	private root: Root;
	private app: Application;
	private view: HTMLCanvasElement;

	constructor(root: Root) {
		this.root = root;
		this.app = root.applicationState.app;
		this.view = this.app.canvas;
	}

	public render(View: (prop: { width: number; height: number }) => ReactNode) {
		// ErrorBoundary is necessary to correctly handle errors globally
		this.root.render(
			__DEV__ && !DEBUGGER_MODE
				? (
					<StrictMode>
						<ErrorBoundary>
							<View width={this.view.width} height={this.view.height} />
						</ErrorBoundary>
					</StrictMode>
				)
				: (
					<ErrorBoundary>
						<View width={this.view.width} height={this.view.height} />
					</ErrorBoundary>
				),
			{},
		);

		this.app.ticker.update();

		if (__DEV__) {
			offerScreenshot(this.view);
		}
	}

	public destroy() {
		this.app.destroy({
			removeView: true,
		});
	}
}
