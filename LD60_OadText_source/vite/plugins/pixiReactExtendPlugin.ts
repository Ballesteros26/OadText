import { type FilterPattern, type Plugin } from 'vite';
import { prefixRegex } from '@rolldown/pluginutils';
import { excludeVirtualModules } from '../utils/filter';

const virtualPrefix = 'virtual:pixi-react-extend:';

function capitalize(value: string) {
	return value[0].toUpperCase() + value.slice(1);
}

export default function pixiReactExtendPlugin(options: {
	componentModule: string;
	componentMatcher: RegExp;
	componentFilter: (componentName: string) => boolean;
	include?: FilterPattern;
	exclude?: FilterPattern;
}) {
	return {
		name: 'pixi-react-extend-plugin',
		resolveId: {
			filter: {
				id: prefixRegex(virtualPrefix),
			},
			handler(source: string) {
				return `\0${source}`;
			},
		},
		load: {
			filter: {
				id: prefixRegex(`\0${virtualPrefix}`),
			},
			handler(id) {
				const componentName = id.slice(virtualPrefix.length + 1);
				return `import { ${componentName} } from '${options.componentModule}';
import { extend } from '@pixi/react';

extend({ ${componentName} })`;
			},
		},
		enforce: 'post',
		transform: {
			filter: {
				id: excludeVirtualModules({
					include: options.include,
					exclude: options.exclude,
				}),
			},
			handler(code) {
				const componentNames = new Set(code.matchAll(options.componentMatcher)
					.map(match => match[1])
					.filter(options.componentFilter)
					.map((componentName: string) =>
						componentName.startsWith('pixi')
							? componentName.slice(4)
							: capitalize(componentName)
					));

				if (componentNames.size === 0) {
					return null;
				}

				// add at the end so that source maps continue to work
				return code + ';\n' + componentNames
					.values()
					.map(v => `import '${virtualPrefix}${v}'`)
					.toArray()
					.join('\n');
			},
		},
	} satisfies Plugin;
}
