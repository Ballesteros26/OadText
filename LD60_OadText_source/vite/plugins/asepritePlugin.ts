/// <reference path="generateDeclarationsPlugin.ts" />

import path from 'node:path';
import fs from 'node:fs/promises';

import { type FilterPattern, type Logger, type Plugin, createFilter, createLogger } from 'vite';
import getAssetHandler from '../utils/getAssetHandler';
import { excludeVirtualModules } from '../utils/filter';

import Aseprite from 'ase-parser';
import { Jimp, BlendMode as JimpBlendMode } from 'jimp';

enum AsepriteBlendMode {
	NORMAL = 0,
	MULTIPLY = 1,
	SCREEN = 2,
	OVERLAY = 3,
	DARKEN = 4,
	LIGHTEN = 5,
	COLOR_DODGE = 6,
	COLOR_BURN = 7,
	HARD_LIGHT = 8,
	SOFT_LIGHT = 9,
	DIFFERENCE = 10,
	EXCLUSION = 11,
	HUE = 12,
	SATURATION = 13,
	COLOR = 14,
	LUMINOSITY = 15,
	ADDITION = 16,
	SUBTRACT = 17,
	DIVIDE = 18,
}

const name = 'aseprite-plugin';

export default function asepritePlugin(options: {
	include?: FilterPattern;
	exclude?: FilterPattern;
	/**
	 * Add padding between frames
	 */
	shapePadding: number;
}) {
	const filter = createFilter(
		options.include ?? '**/*.aseprite',
		options.exclude,
	);

	const {
		designateAsset,
		plugin,
	} = getAssetHandler(name);

	let isBuild: boolean;
	let logger: Logger;

	return [
		plugin,
		{
			name,
			configResolved(config) {
				isBuild = config.command === 'build';
				logger = createLogger(config.logLevel, {
					prefix: `[${name}]`,
				});
			},
			load: {
				filter: {
					id: excludeVirtualModules({
						include: options.include ?? '**/*.aseprite',
						exclude: options.exclude,
					}),
				},
				async handler(id) {
					const aseFile = loadAsepriteData(id);
					const imageBuffer = createImage(aseFile, logger, options.shapePadding)
						.then(image => image.getBuffer('image/png'));

					const imageAsset = await designateAsset(
						this,
						`${id}.png`,
						imageBuffer,
					);

					const spriteSheetData = Promise.all([imageAsset.assetPath, aseFile])
						.then(([imagePath, aseFile]) =>
							createSpriteSheet(
								logger,
								aseFile,
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

					const data = loadAsepriteData(id);
					const image = createImage(data, logger, 0);
					const preview = (await image).getBase64('image/png');

					return {
						kind: 'ASSET',
						extension: 'json',
						comment: `![preview](${await preview})`,
						meta: {
							preview,
							animationNames: (await data).tags.map(tag => tag.name),
						},
					};
				},
			},
		} satisfies Plugin,
	];
}

async function loadAsepriteData(id: string) {
	const buffer = await fs.readFile(id);
	const data = new Aseprite(buffer, '');
	data.parse();
	return data;
}

async function createImage(aseFilePromise: Promise<Aseprite>, logger: Logger, shapePadding: number) {
	const aseFile = await aseFilePromise;
	return aseFile.frames
		.map(frame => {
			return frame.cels
				.toSorted((a, b) => {
					const orderA = a.layerIndex + a.zIndex;
					const orderB = b.layerIndex + b.zIndex;
					// sort by order, then by zIndex
					return orderA - orderB || a.zIndex - b.zIndex;
				})
				.reduce(
					(image, cel) => {
						const layer = aseFile.layers[cel.layerIndex];
						if (!layer.flags.visible) {
							return image;
						}

						const buffer = new Jimp({
							width: cel.w,
							height: cel.h,
							color: 0x00000000,
							data: cel.rawCelData,
						});

						return image.composite(buffer, cel.xpos, cel.ypos, {
							mode: toJimpBlendMode(logger, layer.blendMode),
							opacitySource: layer.opacity / 255,
							opacityDest: 1,
						});
					},
					new Jimp({
						width: aseFile.width,
						height: aseFile.height,
						color: 0x00000000,
					}),
				);
		})
		.reduce(
			(image, frame, index) => {
				return image.composite(
					frame,
					index * (aseFile.width + shapePadding),
					0,
				);
			},
			new Jimp({
				width: aseFile.width * aseFile.numFrames + shapePadding * (aseFile.numFrames - 1),
				height: aseFile.height,
				color: 0x00000000,
			}),
		);
}

function toJimpBlendMode(logger: Logger, blendMode: AsepriteBlendMode): JimpBlendMode {
	const blendModes = {
		[AsepriteBlendMode.NORMAL]: JimpBlendMode.SRC_OVER,
		[AsepriteBlendMode.MULTIPLY]: JimpBlendMode.MULTIPLY,
		[AsepriteBlendMode.SCREEN]: JimpBlendMode.SCREEN,
		[AsepriteBlendMode.OVERLAY]: JimpBlendMode.OVERLAY,
		[AsepriteBlendMode.DARKEN]: JimpBlendMode.DARKEN,
		[AsepriteBlendMode.LIGHTEN]: JimpBlendMode.LIGHTEN,
		// [BlendMode.COLOR_DODGE]: BlendMode.SRC_OVER,
		// [BlendMode.COLOR_BURN]:  BlendMode.SRC_OVER,
		[AsepriteBlendMode.HARD_LIGHT]: JimpBlendMode.HARD_LIGHT,
		// [BlendMode.SOFT_LIGHT]:  BlendMode.SRC_OVER,
		[AsepriteBlendMode.DIFFERENCE]: JimpBlendMode.DIFFERENCE,
		[AsepriteBlendMode.EXCLUSION]: JimpBlendMode.EXCLUSION,
		// [BlendMode.HUE]:         BlendMode.SRC_OVER,
		// [BlendMode.SATURATION]:  BlendMode.SRC_OVER,
		// [BlendMode.COLOR]:       BlendMode.SRC_OVER,
		// [BlendMode.LUMINOSITY]:  BlendMode.SRC_OVER,
		[AsepriteBlendMode.ADDITION]: JimpBlendMode.ADD,
		// [BlendMode.SUBTRACT]:    BlendMode.SRC_OVER,
		// [BlendMode.DIVIDE]:      BlendMode.SRC_OVER,
	};

	if (!(blendMode in blendModes)) {
		logger.warn(`BlendMode '${blendMode}' is not supported.`, {
			timestamp: true,
		});
		return JimpBlendMode.SRC_OVER;
	} else {
		return blendModes[blendMode];
	}
}

function createSpriteSheet(logger: Logger, data: Aseprite, imagePath: string, shapePadding = 0) {
	const spritesheet = {
		meta: {
			image: imagePath,
			size: { w: data.width, h: data.height },
			scale: '1',
			editorData: {
				animations: data.tags.map(tag => convertTagToAnimation(logger, tag, data.frames)),
				tilesWide: data.numFrames,
				tilesHigh: 1,
			},
			aseprite: data,
		},
		frames: {},
	};

	for (let x = 0; x < data.numFrames; x++) {
		spritesheet.frames[imagePath + x] = {
			frame: {
				x: x * (data.width + shapePadding),
				y: 0,
				w: data.width,
				h: data.height,
			},
		};
	}

	return spritesheet;
}

const validAnimationDirections = [
	'Forward',
	'Reverse',
	'Ping-pong',
	'Ping-pong Reverse',
];

function convertTagToAnimation(logger: Logger, tag: Aseprite.Tag, frames: Aseprite.Frame[]) {
	let direction = tag.animDirection;

	if (!validAnimationDirections.includes(direction)) {
		logger.warn(`Invalid animation direction: ${direction}`, {
			timestamp: true,
		});
		direction = 'Forward';
	}

	const textures = new Array(tag.to - tag.from + 1).fill(0)
		.map((_, index) => ({
			texture: tag.from + index,
			time: frames[tag.from + index].frameDuration,
		}));

	// reverse before ping-pong, otherwise the first frame is wrong
	if (direction.endsWith('Reverse')) {
		textures.reverse();
	}

	if (direction.startsWith('Ping-pong')) {
		textures.push(...textures.slice(1, -1).reverse());
	}

	// TODO repeat is not supported by ase-parser

	return {
		name: tag.name,
		textures,
	};
}
