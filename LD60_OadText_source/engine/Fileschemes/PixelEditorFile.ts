// TODO testen
// TODO warnung für nicht unterstütze sachen (bzw implementieren)

import type * as PIXI from 'pixi.js';

type EditorData = {
	animations: {
		name: string;
		textures: {
			texture: number;
			time: number;
		}[];
	}[];
	tilesWide: number;
	tilesHigh: number;
};

export type PixelSpritesheetData = PIXI.SpritesheetData & { meta: { editorData: EditorData } };

export class PixelEditorFile<
	AnimationNames extends string = string,
	Width extends number = number,
	Height extends number = number,
> {
	private readonly image: string;
	private readonly textures: PIXI.Spritesheet['textures'];
	// expose textureSource for HMR
	public readonly textureSource: PIXI.TextureSource;

	private readonly tilesWide: number;
	private readonly tilesHigh: number;

	private animations: PIXI.FrameObject[][] = [];
	private animationNames: Map<AnimationNames, number> = new Map();

	constructor(sheet: PIXI.Spritesheet<PixelSpritesheetData>) {
		const data = sheet.data.meta.editorData;

		this.image = sheet.data.meta.image!;
		this.textures = sheet.textures;
		this.textureSource = sheet.textureSource;

		this.tilesWide = data.tilesWide;
		this.tilesHigh = data.tilesHigh;

		this.init(data);
	}

	private init(data: EditorData) {
		data.animations.forEach((animation, index) => {
			if (this.animationNames.has(animation.name as AnimationNames)) {
				console.warn(`Some Animations are using the same Name.`);
			} else {
				this.animationNames.set(animation.name as AnimationNames, index);
			}

			const textures: PIXI.FrameObject[] = animation.textures
				.map((frame) => ({
					...frame,
					texture: this.textures[this.image + frame.texture],
				}));

			this.animations.push(textures);
		});
	}

	public getTile(x: Width, y: Height): PIXI.Texture {
		if (x >= this.tilesWide || y >= this.tilesHigh) {
			throw new Error(`Tile (${x}, ${y}) does not exist.`);
		}

		return this.textures[this.image + (x + y * this.tilesWide)];
	}

	public getAnimationById(id: number): PIXI.FrameObject[] {
		if (id >= this.animations.length) {
			throw new Error(`Animation if id '${id}' is not defined.`);
		}

		return this.animations[id];
	}

	public getAnimation(name: AnimationNames): PIXI.FrameObject[] {
		const id = this.animationNames.get(name);

		if (id === undefined) {
			throw new Error(`Animation '${name}' is not defined.`);
		}

		return this.getAnimationById(id);
	}
}
