import { type FilterPattern, type Plugin, createFilter } from 'vite';

export default function proxyExtensionPlugin(options: {
	proxyExtension: string;
	include: FilterPattern;
	exclude?: FilterPattern;
}) {
	const filter = createFilter(
		options.include,
		options.exclude,
	);

	return {
		name: 'extension-proxy-plugin',
		resolveId: {
			order: 'pre',
			async handler(source, importer, opts) {
				const id = (await this.resolve(source, importer, opts))?.id;
				if (id != null && filter(id)) {
					if (id.includes('?')) {
						return id.replace('?', `.${options.proxyExtension}?`);
					}
					return `${id}.${options.proxyExtension}}`;
				}
			},
		},
	} satisfies Plugin;
}
