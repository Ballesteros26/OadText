/// <reference path="generateDeclarationsPlugin.ts" />

import fs from 'node:fs/promises';

import { type FilterPattern, type Plugin, createFilter } from 'vite';
import { excludeVirtualModules } from '../utils/filter';

function getTextContent(path: string) {
	return fs.readFile(path, {
		encoding: 'utf8',
	});
}

export default function textPlugin(options: {
	include: FilterPattern;
	exclude?: FilterPattern;
	enforce?: 'pre' | 'post';
}) {
	const filter = createFilter(
		options.include,
		options.exclude,
	);

	return {
		name: 'font-plugin',
		enforce: options.enforce,
		load: {
			filter: {
				id: excludeVirtualModules({
					include: options.include,
					exclude: options.exclude,
				}),
			},
			async handler(id) {
				const content = await getTextContent(id);

				const escapedContent = content
					.replaceAll('\\', '\\\\')
					.replaceAll('$', '\\$')
					.replaceAll('`', '\\`');
				console.log(escapedContent);

				return `export default \`${escapedContent}\``;
			},
		},
		typing: {
			async load(id) {
				if (!filter(id)) {
					return null;
				}

				return {
					kind: 'TS_TYPE',
					comment: [
						'```',
						await getTextContent(id),
						'```',
					].join('\n'),
					type: 'string',
				};
			},
		},
	} satisfies Plugin;
}
