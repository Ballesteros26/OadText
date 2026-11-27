/// <reference path="generateDeclarationsPlugin.ts" />

import { type FilterPattern, type Plugin, createFilter } from 'vite';
import { excludeVirtualModules } from '../utils/filter';
import { getHash } from '../utils/random';

export default function fontPlugin(options: {
	include?: FilterPattern;
	exclude?: FilterPattern;
}) {
	const filter = createFilter(
		options.include,
		options.exclude,
	);

	return {
		name: 'font-plugin',
		transform: {
			filter: {
				id: excludeVirtualModules({
					include: options.include,
					exclude: options.exclude,
				}),
			},
			handler(code) {
				// fontName must not start with a number and must not contain a '.' for Firefox
				const fontName = `_${getHash(code)}`;
				// fonts are already handled by vite as assets
				return `${code.replace(/export\s+default/, 'const fontUrl = ')};

const font = await new FontFace(
	"${fontName}",
	\`url(\${fontUrl})\`,
).load();
document.fonts.add(font);

export default "${fontName}";`;
			},
		},
		typing: {
			transform(_, id) {
				if (filter(id)) {
					return {
						kind: 'TS_TYPE',
						type: 'string',
					};
				}
			},
		},
	} satisfies Plugin;
}
