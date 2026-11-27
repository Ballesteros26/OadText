/// <reference path="generateDeclarationsPlugin.ts" />

import path from 'node:path';
import fs from 'node:fs/promises';

import { type FilterPattern, type Plugin, createFilter } from 'vite';
import getAssetHandler from '../utils/getAssetHandler';
import { excludeVirtualModules } from '../utils/filter';

const name = 'spritesheet-plugin';

export default function spritesheetPlugin(options: {
	include: FilterPattern;
	exclude?: FilterPattern;
	getJsonPath: (id: string) => string;
}) {
	const filter = createFilter(
		options.include,
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
			name: 'spritesheet-plugin',
			configResolved(config) {
				isBuild = config.command === 'build';
			},
			load: {
				filter: {
					id: excludeVirtualModules({
						include: options.include,
						exclude: options.exclude,
					}),
				},
				async handler(id) {
					const jsonPath = options.getJsonPath(id);
					const content = await fs.readFile(jsonPath, {
						encoding: 'utf8',
					});
					this.addWatchFile(jsonPath);

					let spriteSheetData;
					try {
						spriteSheetData = JSON.parse(content);
					} catch {
						this.error('Failed to parse JSON file.');
					}

					try {
						const absoluteImagePath = path.resolve(path.dirname(jsonPath), spriteSheetData.meta.image);
						// await imageBuffer to ensure it exists
						const imageBuffer = await fs.readFile(absoluteImagePath);
						this.addWatchFile(absoluteImagePath);

						const imageAsset = await designateAsset(this, absoluteImagePath, imageBuffer);
						spriteSheetData.meta.image = path.basename(imageAsset.assetPath);

						const jsonAsset = await designateAsset(
							this,
							`${jsonPath}.json`,
							JSON.stringify(spriteSheetData, null, isBuild ? 0 : 2),
						);

						return `export default ${jsonAsset.javascriptIdentifier}`;
					} catch {
						this.error(`Could not resolve image path from ${id}`);
					}
				},
			},
			typing: {
				async load(id) {
					if (!filter(id)) {
						return null;
					}

					let data;
					try {
						const content = await fs.readFile(options.getJsonPath(id), {
							encoding: 'utf-8',
						});
						data = JSON.parse(content);
					} catch {
						return {
							kind: 'NEVER',
						};
					}

					if (!data.frames || !data.meta?.scale) {
						return {
							kind: 'NEVER',
						};
					}

					return {
						kind: 'ASSET',
						extension: 'json',
					};
				},
			},
		} satisfies Plugin,
	];
}
