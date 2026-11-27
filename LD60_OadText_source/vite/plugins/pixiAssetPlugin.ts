/// <reference path="generateDeclarationsPlugin.ts" />

import { type FilterPattern, type Plugin, createFilter, normalizePath } from 'vite';
import { prefixRegex } from '@rolldown/pluginutils';
import { excludeVirtualModules } from '../utils/filter';
import { getHash, getRandomHash } from '../utils/random';

const virtualPrefix = 'virtual:pixi:';

export default function pixiAssetPlugin(options: {
	include?: FilterPattern;
	exclude?: FilterPattern;
}) {
	const filter = createFilter(
		options.include,
		options.exclude,
	);

	let isBuild: boolean;
	const virtualModules = new Map<string, string>();

	return {
		name: 'pixi-asset-plugin',
		configResolved(config) {
			isBuild = config.command === 'build';
		},
		resolveId: {
			filter: {
				id: prefixRegex(virtualPrefix),
			},
			handler(source) {
				if (virtualModules.has(normalizePath(`\0${source}`))) {
					return `\0${source}`;
				}
				return null;
			},
		},
		load: {
			filter: {
				id: prefixRegex(`\0${virtualPrefix}`),
			},
			handler(id) {
				if (virtualModules.has(id)) {
					const content = virtualModules.get(id);
					if (isBuild) {
						// TODO workaround because concurrentTopLevelAwait calls resolveId multiple times
						virtualModules.set(id, '');
					} else {
						virtualModules.delete(id);
					}
					return content;
				}
				return null;
			},
		},
		transform: {
			filter: {
				id: excludeVirtualModules({
					include: options.include,
					exclude: options.exclude,
				}),
			},
			handler(code: string, id: string) {
				const importPath = `${virtualPrefix}${id}`;
				virtualModules.set(normalizePath(`\0${importPath}`), code);

				const key = getHash(id);
				const buildHash = getRandomHash();

				return `import { Assets } from 'pixi.js';
// register sound loader
import 'engine/Runtime/__loaders/pixi-asset-loader-runtime';
import { Sound } from '@pixi/sound';
import source from '${importPath}';

function getHotSource(source) {
	const isBase64 = source.startsWith('data:');
	return isBase64
		? source
		// For HMR: add hash to path because pixi loads every url only once
		: \`\${source}?${buildHash}\`;
}

const path = ${isBuild}
	? source
	: Array.isArray(source)
	? source.map(getHotSource)
	: getHotSource(source);

// using 'name.{ext1,ext2}' syntax requires adding the asset first
if (import.meta.hot?.data.previousPath == null) {
	Assets.add({
		alias: '${key}',
		src: path,
	});
}
const asset = await Assets.load('${key}');

if(import.meta.hot?.data.previousPath) {
	const previousPath = import.meta.hot.data.previousPath;
	const baseTexture = asset.source ?? asset.textureSource;

	if(baseTexture) {
		// Solution from https://www.html5gamedevs.com/topic/47279-basetexture-image-resource-source-update-on-the-fly/
		// also see https://github.com/pixijs/pixijs/issues/5609
		if (baseTexture.resource instanceof HTMLCanvasElement) {
			Assets.load(path).then(asset => {
				const source = asset.source ?? asset.textureSource;
				baseTexture.resize(source.width, source.height, source._resolution);
				const canvas = baseTexture.resource;
				canvas.width = source.width;
				canvas.height = source.height;
				const ctx = canvas.getContext('2d');
				ctx.clearRect(0, 0, canvas.width, canvas.height);
				ctx.drawImage(source.resource, 0, 0);
				baseTexture.update();
			}).catch(e => {
				console.error(e);
			});
		} else {
			console.warn('source has to be a CanvasSource for HMR');
		}
	}

	if(asset instanceof Sound) {
		Assets.load(path).then(sound => {
			asset.media = sound.media;
		}).catch(e => {
			console.error(e);
		});
	}
}

export default asset;

if(import.meta.hot) {
	import.meta.hot.accept();
	import.meta.hot.dispose(data => {
		data.previousPath = path;
	});
}`;
			},
		},
		typing: {
			transform(typing, id) {
				if (!filter(id)) {
					return null;
				}
				if (typing.kind !== 'ASSET') {
					throw new Error('Can not transform type');
				}
				const extension = Array.isArray(typing.extension)
					? typing.extension[0]
					: typing.extension;

				if (extension === 'json' && typing.meta) {
					const meta = typing.meta;
					let animationNames: any[] = [];
					if (typeof meta === 'object' && 'animationNames' in meta) {
						if (Array.isArray(meta.animationNames)) {
							animationNames = meta.animationNames;
						}
					}
					const animationNameType = animationNames?.length > 0
						? animationNames.map(name => `"${name}"`).join(' | ')
						: 'never';
					return {
						kind: 'TS_TYPE',
						imports: [
							'import { PixelEditorFile } from "engine/Fileschemes/PixelEditorFile";',
							'import * as PIXI from "pixi.js";',
						],
						comment: typing.comment,
						type: `${
							typeof typing.meta == 'object' && 'preview' in typing.meta
								? `{
	/**
	 * ![preview](${typing.meta.preview})
	 */
	readonly textureSource: PIXI.TextureSource;
	/**
	 * ![preview](${typing.meta.preview})
	 */
	getTile(x: number, y: number): PIXI.Texture;
	/**
	 * ![preview](${typing.meta.preview})
	 */
	getAnimationById(id: number): PIXI.FrameObject[];
	/**
	 * ![preview](${typing.meta.preview})
	 */
	getAnimation(name: ${animationNameType}): PIXI.FrameObject[];
}`
								: ''
						} & PixelEditorFile<${animationNameType}>`,
					};
				}
				if (extension === 'json') {
					return {
						kind: 'TS_TYPE',
						imports: [
							'import { Spritesheet } from "pixi.js";',
						],
						comment: typing.comment,
						type: `Spritesheet`,
					};
				}
				if (
					['ogg', 'oga', 'opus', 'm4a', 'mp3', 'mpeg', 'wav', 'aiff', 'wma', 'mid', 'caf'].includes(extension)
				) {
					return {
						kind: 'TS_TYPE',
						imports: [
							'import { Sound } from "@pixi/sound";',
						],
						comment: typing.comment,
						type: 'Sound',
					};
				}
				if (['jpg', 'jpeg', 'png', 'avif', 'webp'].includes(extension)) {
					return {
						kind: 'TS_TYPE',
						imports: [
							'import { Texture } from "pixi.js";',
						],
						comment: typing.comment,
						type: 'Texture',
					};
				}
				if (extension === 'xml' && typing.meta) {
					if (typeof typing.meta === 'object' && 'root' in typing.meta && typing.meta.root === 'font') {
						return {
							kind: 'TS_TYPE',
							imports: [
								'import { BitmapFont } from "pixi.js";',
							],
							comment: typing.comment,
							type: 'BitmapFont',
						};
					}
				}
				throw new Error('Unknown extension');
			},
		},
	} satisfies Plugin;
}
