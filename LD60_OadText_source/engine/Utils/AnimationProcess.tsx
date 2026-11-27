import { component } from 'engine/View/Decorators';
import * as PIXI from 'pixi.js';
import Process from 'engine/Process/Process';
import type { PixiElements } from '@pixi/react';
import { useImperativeHandle } from 'react';

/**
 * A {@link Process} updating the contained {@link PIXI.AnimatedSprite}.
 */
export default class AnimationProcess extends Process<void> {
	public readonly animatedSprite: PIXI.AnimatedSprite;
	private readonly ticker = new PIXI.Ticker();
	private currentTime = 0;

	constructor(textures: PIXI.FrameObject[]) {
		super();
		this.animatedSprite = new PIXI.AnimatedSprite(textures, false);
		this.animatedSprite.play();
	}

	protected step(deltaTime: number) {
		this.currentTime += deltaTime;
		this.ticker.update(this.currentTime * 1000);

		this.animatedSprite.update(this.ticker);
	}

	@component()
	public View(props: Omit<PixiElements['pixiAnimatedSprite'], 'textures'>) {
		const { ref, ...rest } = props;
		useImperativeHandle(ref, () => this.animatedSprite, []);

		const texture = this.animatedSprite.texture;

		const anchor = this.animatedSprite.updateAnchor
			? texture.defaultAnchor
			: props.anchor;

		return (
			<pixiSprite
				{...rest}
				texture={texture}
				{...anchor ? { anchor } : {}}
			/>
		);
	}

	public destroy() {
		this.animatedSprite.destroy();
		this.ticker.destroy();
		super.destroy();
	}
}
