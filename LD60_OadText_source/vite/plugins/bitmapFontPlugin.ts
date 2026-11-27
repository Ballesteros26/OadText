import path from 'node:path';
import fs from 'node:fs/promises';

import { createFilter, type FilterPattern, type Plugin } from 'vite';
import getAssetHandler from '../utils/getAssetHandler';
import { excludeVirtualModules } from '../utils/filter';
import { getHash } from '../utils/random';

import { Jimp, ResizeStrategy } from 'jimp';

const name = 'bitmap-font-plugin';

const previewText = 'The quick brown fox jumps over the lazy dog.';
const previewPadding = 2;

export default function bitmapFontPlugin(options: {
	include: FilterPattern;
	exclude?: FilterPattern;
	lineHeight: number;
	charset: string;
}) {
	const filter = createFilter(
		options.include,
		options.exclude,
	);

	const {
		designateAsset,
		plugin,
	} = getAssetHandler(name);

	return [
		plugin,
		{
			name,
			enforce: 'pre',
			load: {
				filter: {
					id: excludeVirtualModules({
						include: options.include,
						exclude: options.exclude,
					}),
				},
				async handler(id) {
					const buffer = fs.readFile(id);
					const rawImage = buffer.then(Jimp.fromBuffer);

					const imageAsset = await designateAsset(
						this,
						`${id}.png`,
						rawImage.then(rawImage =>
							rawImage
								.clone()
								.crop({ x: 0, y: 0, w: rawImage.width, h: rawImage.height - 2 })
								.invert()
								.getBuffer('image/png')
						),
					);

					const fontName = buffer.then(getHash);
					const chars = rawImage.then(rawImage => getCharacterPositions(rawImage, options.charset));

					const xml = Promise.all([rawImage, imageAsset.assetPath, fontName, chars])
						.then(([rawImage, assetPath, fontName, chars]) =>
							`<font>
    <info face="${fontName}" size="${
								rawImage.height - 2
							}" bold="0" italic="0" chasrset="" unicode="0" stretchH="100" smooth="1" aa="1" padding="0,0,0,0" spacing="1,1"/>
    <common lineHeight="${options.lineHeight}" base="0" scaleW="1" scaleH="1" pages="1" packed="0"/>
    <pages>
        <page id="0" file="${path.basename(assetPath)}"/>
    </pages>
    <chars count="1">${
								chars.map(c => `
		<char
			id="${c.label.charCodeAt(0)}"
			x="${c.x}"
			y="${c.y}"
			width="${c.width}"
			height="${c.height}"
			xoffset="0"
			yoffset="0"
			xadvance="${c.xadvance}"
			page="0"
			chnl="0"
			letter="${escapeCharacter(c.label)}"
		/>`).join('')
							}
	</chars>
</font>`
						);
					const xmlAsset = await designateAsset(
						this,
						`${id}.xml`,
						xml,
					);

					return `export default ${xmlAsset.javascriptIdentifier}`;
				},
			},
			typing: {
				async load(id) {
					if (!filter(id)) {
						return null;
					}

					const imageBuffer = await fs.readFile(id);
					const rawImage = await Jimp.fromBuffer(imageBuffer);

					const characters = Object.fromEntries(getCharacterPositions(rawImage, options.charset)
						.map(c => [c.label, c]));

					const previewCharacters = previewText.split('')
						.map(label => characters[label] ?? characters['?'] ?? characters['_'] ?? characters[' ']);

					const previewWidth = previewCharacters
						.map(e => e?.xadvance ?? 0)
						.reduce((a, b) => a + b) + 2 * previewPadding;

					const previewImage = new Jimp({
						width: previewWidth,
						height: rawImage.height - 2 + 2 * previewPadding,
						color: 0xFFFFFFFF,
					});

					let cursor = previewPadding;
					previewCharacters
						.map(c => {
							previewImage.blit({
								src: rawImage,
								x: cursor,
								y: previewPadding,
								srcX: c?.x ?? 0,
								srcW: c?.width ?? 0,
								srcH: rawImage.height - 2,
							});
							cursor += c?.xadvance ?? 0;
						});

					const previewScale = 2;
					previewImage.scale({
						f: previewScale,
						mode: ResizeStrategy.NEAREST_NEIGHBOR,
					});

					return {
						kind: 'ASSET',
						extension: 'xml',
						comment: `![preview](${await previewImage.getBase64('image/png')})`,
						meta: {
							root: 'font',
						},
					};
				},
			},
		} satisfies Plugin,
	];
}

function getCharacterPositions(rawImage: Awaited<ReturnType<typeof Jimp.fromBuffer>>, charset: string) {
	const chars: {
		label: string;
		x: number;
		y: number;
		width: number;
		height: number;
		xadvance: number;
	}[] = [];
	const length = rawImage.width;
	const lastRow = rawImage.height - 1;
	let letterSpacing = 0;

	for (let x = 0; x < length && chars.length < charset.length; x++) {
		const color = rawImage.getPixelColor(x, lastRow);
		if (color == 0) {
			if (chars.length === 0) {
				letterSpacing++;
			}
			continue;
		}

		const start = x;
		while (rawImage.getPixelColor(++x, lastRow) > 0) {
			// noop
		}
		const label = charset[chars.length];
		chars.push({
			label,
			x: start,
			y: 0,
			width: x - start,
			height: rawImage.height - 2,
			xadvance: x - start + (label !== ' ' ? letterSpacing : 0),
		});
	}
	return chars;
}

function escapeCharacter(character: string) {
	return {
		' ': 'space',
		'"': '&quot;',
		'&': '&amp;',
		'<': '&lt;',
	}[character] ?? character;
}
