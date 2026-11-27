import { offerScreenshot } from '../../devHooks';

import * as PIXI from 'pixi.js';

export async function createPixiStage(target: HTMLElement, { width = 0, height = 0, scale = 0 }) {
	const renderer = await PIXI.autoDetectRenderer({
		antialias: false,
	});
	renderer.canvas.style.position = 'fixed';
	target.appendChild(renderer.canvas);

	return new PixiStage(renderer, { width, height, scale });
}

class PixiStage {
	private renderer: PIXI.Renderer;
	public stage: PIXI.Container;

	private _width: number;
	private _height: number;
	private _scale: number;

	private callback = this.fitToScreen.bind(this);

	constructor(renderer: PIXI.Renderer, { width, height, scale }) {
		this._width = width;
		this._height = height;
		this._scale = scale;

		this.renderer = renderer;
		this.stage = new PIXI.Container();

		this.fitToScreen();

		// TODO use https://developer.mozilla.org/en-US/docs/Web/API/ResizeObserver
		window.addEventListener('resize', this.callback);
	}

	public set width(v: number) {
		this._width = v;
		this.fitToScreen();
	}
	public get width(): number {
		return this._width;
	}
	public set height(v: number) {
		this._height = v;
		this.fitToScreen();
	}
	public get height(): number {
		return this._height;
	}
	public set scale(v: number) {
		this._scale = v;
		this.fitToScreen();
	}
	public get scale(): number {
		return this._scale;
	}

	private fitToScreen() {
		let width = this._width;
		let height = this._height;
		let scale = this._scale;

		let maxScale = Math.min(window.innerWidth / width, window.innerHeight / height);

		if (scale === 0 || scale > maxScale) {
			// if both dimensions are undefined
			if (maxScale === Infinity) {
				maxScale = 1;
			}
			scale = maxScale;
		}

		if (width === 0) {
			width = window.innerWidth / scale;
		}
		if (height === 0) {
			height = window.innerHeight / scale;
		}

		// position canvas
		this.renderer.canvas.style.position = 'absolute';

		/*	this.renderer.canvas.style.width = `${Math.round(width * scale)}px`;
		this.renderer.canvas.style.height = `${Math.round(height * scale)}px`;*/
		this.renderer.canvas.style.left = `${(window.innerWidth - width * scale) / 2 | 0}px`;
		this.renderer.canvas.style.top = `${(window.innerHeight - height * scale) / 2 | 0}px`;

		//this.renderer.resolution = scale;

		this.stage.scale.x = scale;
		this.stage.scale.y = scale;

		this.renderer.resize(Math.round(width * scale), Math.round(height * scale));

		//width = Math.round(width);
		//height = Math.round(height);
		//app.emit("resize");
	}

	public render() {
		this.renderer.render(this.stage);
		if (__DEV__) {
			offerScreenshot(this.renderer.canvas);
		}
	}

	public destroy() {
		window.removeEventListener('resize', this.callback);
		this.renderer.destroy(true);
	}
}
