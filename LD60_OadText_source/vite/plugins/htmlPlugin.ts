import path from 'node:path';
import fs from 'node:fs/promises';

import { type HtmlTagDescriptor, type Plugin } from 'vite';

export default function htmlPlugin(options: {
	title?: string;
	favicon?: string;
}) {
	let isBuild: boolean;
	let root: string;
	let faviconAsset: string;

	return {
		name: 'html-plugin',
		configResolved(config) {
			isBuild = config.command === 'build';
			root = config.root;
		},
		async buildStart() {
			if (isBuild && options.favicon) {
				const faviconFilePath = path.resolve(root, options.favicon);
				faviconAsset = this.getFileName(this.emitFile({
					type: 'asset',
					name: path.basename(options.favicon),
					source: await fs.readFile(faviconFilePath),
					originalFileName: faviconFilePath,
				}));
			}
		},
		transformIndexHtml() {
			const additionalTags: HtmlTagDescriptor[] = [];

			if (options.title) {
				additionalTags.push({
					tag: 'title',
					children: options.title,
				});
			}

			if (options.favicon) {
				additionalTags.push({
					tag: 'link',
					attrs: {
						rel: 'icon',
						href: isBuild
							? faviconAsset
							: options.favicon,
					},
				});
			}

			return additionalTags;
		},
	} satisfies Plugin;
}
