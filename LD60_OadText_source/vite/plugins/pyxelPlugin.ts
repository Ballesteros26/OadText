/// <reference path="generateDeclarationsPlugin.ts" />

import path from 'node:path';

import { type FilterPattern, type Plugin, createFilter } from 'vite';
import { type PluginContext } from 'rolldown';
import getAssetHandler from '../utils/getAssetHandler';
import { excludeVirtualModules } from '../utils/filter';

import unzipper from 'unzipper';
import { BlendMode, Jimp } from 'jimp';

type JimpInstance = Awaited<ReturnType<typeof Jimp.fromBuffer>>;

const name = 'pyxel-plugin';

export default function pyxelPlugin(options: {
	include?: FilterPattern;
	exclude?: FilterPattern;
	/**
	 * Add padding between frames
	 */
	shapePadding: number;
}) {
	const filter = createFilter(
		options.include ?? '**/*.pyxel',
		options.exclude,
	);

	const {
		designateAsset,
		plugin,
	} = getAssetHandler(name);

	let isBuild: boolean;

	return [
		plugin,
		{
			name: name,
			configResolved(config) {
				isBuild = config.command === 'build';
			},
			load: {
				filter: {
					id: excludeVirtualModules({
						include: options.include ?? '**/*.pyxel',
						exclude: options.exclude,
					}),
				},
				async handler(id) {
					const fileData = loadPyxelData(id);
					const imageBuffer = createImage.call(this, fileData, options.shapePadding)
						.then(image => image.getBuffer('image/png'));

					const imageAsset = await designateAsset(
						this,
						`${id}.png`,
						imageBuffer,
					);

					const spriteSheetData = Promise.all([imageAsset.assetPath, fileData])
						.then(([imagePath, [docData]]) =>
							createSpriteSheet(
								docData,
								`./${path.basename(imagePath)}`,
								options.shapePadding,
							)
						);

					const spritesheetAsset = await designateAsset(
						this,
						`${id}.json`,
						spriteSheetData.then(data => JSON.stringify(data, null, isBuild ? 0 : 2)),
					);

					return `export default ${spritesheetAsset.javascriptIdentifier}`;
				},
			},
			typing: {
				async load(id) {
					if (!filter(id)) {
						return null;
					}

					const fileData = loadPyxelData(id);
					const image = createImage.call(this, fileData, options.shapePadding);
					const preview = (await image).getBase64('image/png');

					return {
						kind: 'ASSET',
						extension: 'json',
						comment: `![preview](${await preview})`,
						meta: {
							preview,
							animationNames: Object.values((await fileData)[0].animations)
								.map((animation: any) => animation.name),
						},
					};
				},
			},
		} satisfies Plugin,
	];
}

async function loadPyxelData(id: string): Promise<[docData: any, ...layers: JimpInstance[]]> {
	const files: any[] = (await unzipper.Open.file(id)).files;

	const docData = files.find(file => file.path === 'docData.json')
		.buffer()
		.then(buffer => buffer.toString())
		.then(JSON.parse);

	const layers = files
		.filter(file => file.path.startsWith('layer'))
		.sort((a, b) => parseInt(a.path.slice(5)) - parseInt(b.path.slice(5)))
		.map(file => {
			return (file.buffer() as Promise<Buffer>).then(Jimp.fromBuffer);
		});

	return Promise.all([docData, ...layers]);
}

async function createImage(
	this: PluginContext,
	fileData: Promise<[docData: any, ...layers: JimpInstance[]]>,
	shapePadding: number,
) {
	const [docData, ...layers] = await fileData;
	const { width, height, tileWidth, tileHeight, layers: data } = docData.canvas;

	let image = layers.reduceRight((acc, value, i) => {
		// value is undefined for group layers
		if (!layerIsVisible.call(this, i, data) || value === undefined) {
			return acc;
		}
		return acc.composite(value, 0, 0, {
			mode: toJimpBlendMode.call(this, data[i].blendMode),
			opacitySource: data[i].alpha / 255,
			opacityDest: 1,
		});
	}, new Jimp({ width, height, color: 0x00000000 }));

	if (shapePadding > 0) {
		image = applyShapePadding(
			image,
			shapePadding,
			width,
			height,
			tileWidth,
			tileHeight,
		);
	}

	return image;
}

function layerIsVisible(this: PluginContext, layerIndex: number, layers: any) {
	if (layerIndex < 0) {
		return true;
	} else if (layers[String(layerIndex)].hidden) {
		return false;
	} else if (layers[String(layerIndex)].parentIndex === undefined) {
		// Pyxel 4.8
		return true;
	} else if (layers[String(layerIndex)].parentIndex >= layerIndex) {
		// avoid endless recursion
		this.error(new Error('Invalid parentIndex in pyxel file.'));
	} else {
		return layerIsVisible.call(this, layers[String(layerIndex)].parentIndex, layers);
	}
}

function toJimpBlendMode(this: PluginContext, blendMode: string) {
	const blendModes = {
		normal: BlendMode.SRC_OVER,
		multiply: BlendMode.MULTIPLY,
		difference: BlendMode.DIFFERENCE,
		darken: BlendMode.DARKEN,
		lighten: BlendMode.LIGHTEN,
		hardlight: BlendMode.HARD_LIGHT,
		overlay: BlendMode.OVERLAY,
		screen: BlendMode.SCREEN,
	};

	if (!(blendMode in blendModes)) {
		this.warn(new Error(`BlendMode '${blendMode}' is not supported.`));
		return BlendMode.SRC_OVER;
	} else {
		return blendModes[blendMode];
	}
}

function applyShapePadding(
	image: {
		bitmap: {
			data: Buffer | Uint8Array;
			width: number;
			height: number;
		};
	},
	shapePadding: number,
	width: number,
	height: number,
	tileWidth: number,
	tileHeight: number,
) {
	const tx = Math.ceil(width / tileWidth);
	const ty = Math.ceil(height / tileHeight);

	const newWith = width + (tx - 1) * 2 * shapePadding;
	const newHeight = height + (ty - 1) * 2 * shapePadding;

	const image1 = new Jimp({ width: newWith, height, color: 0x00000000 });
	for (let x = 0; x < tx; x++) {
		image1.blit({
			src: image,
			x: x * tileWidth + x * 2 * shapePadding,
			y: 0,
			srcX: x * tileWidth,
			srcY: 0,
			srcW: tileWidth,
			srcH: height,
		});
		if (x > 0) {
			image1.blit({
				src: image,
				x: x * tileWidth + x * 2 * shapePadding - 2,
				y: 0,
				srcX: x * tileWidth - 1,
				srcY: 0,
				srcW: 2,
				srcH: height,
			});
		}
	}

	const image2 = new Jimp({ width: newWith, height: newHeight, color: 0x00000000 });
	for (let y = 0; y < ty; y++) {
		image2.blit({
			src: image1,
			x: 0,
			y: y * tileHeight + y * 2 * shapePadding,
			srcX: 0,
			srcY: y * tileHeight,
			srcW: newWith,
			srcH: tileHeight,
		});
		if (y > 0) {
			image2.blit({
				src: image1,
				x: 0,
				y: y * tileHeight + y * 2 * shapePadding - 2,
				srcX: 0,
				srcY: y * tileHeight - 1,
				srcW: newWith,
				srcH: 2,
			});
		}
	}

	return image2;
}

function createSpriteSheet(data, imagePath, shapePadding = 0) {
	const tx = Math.ceil(data.canvas.width / data.canvas.tileWidth);
	const ty = Math.ceil(data.canvas.height / data.canvas.tileHeight);

	const spritesheet = {
		meta: {
			image: imagePath,
			size: { w: data.canvas.width, h: data.canvas.height },
			scale: '1',
			editorData: {
				animations: Object.values(data.animations).map(convertAnimation),
				tilesWide: tx,
				tilesHigh: ty,
			},
			pyxel: data,
		},
		frames: {},
	};

	for (let x = 0; x < tx; x++) {
		for (let y = 0; y < ty; y++) {
			spritesheet.frames[imagePath + '' + (x + y * tx)] = {
				// TODO why 2 * shapePadding?
				frame: {
					x: x * data.canvas.tileWidth + x * 2 * shapePadding,
					y: y * data.canvas.tileHeight + y * 2 * shapePadding,
					w: Math.min(data.canvas.tileWidth, data.canvas.width - x * data.canvas.tileWidth), // TODO checken ob ok
					h: Math.min(data.canvas.tileHeight, data.canvas.height - y * data.canvas.tileHeight),
				},
				// rotated: false,
				// trimmed: true,//TODO was macht das?
				// spriteSourceSize: { "x": 6, "y": 5, "w": 167, "h": 226 },
				// sourceSize: { "w": 175, "h": 240 }
			};
		}
	}

	return spritesheet;
}

function convertAnimation(animation) {
	return {
		name: animation.name,
		textures: animation.frameDurationMultipliers
			.map((multiplier: number, index: number) => ({
				texture: animation.baseTile + index,
				time: animation.frameDuration * multiplier / 100,
			})),
	};
}
