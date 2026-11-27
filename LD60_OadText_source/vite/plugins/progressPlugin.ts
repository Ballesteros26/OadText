import { type FilterPattern, type Plugin } from 'vite';
import { excludeVirtualModules } from '../utils/filter';

export default function progressPlugin(options: {
	include?: FilterPattern;
	exclude?: FilterPattern;
}) {
	return {
		name: 'progress-plugin',
		transform: {
			filter: {
				id: excludeVirtualModules({
					include: options.include,
					exclude: options.exclude,
				}),
			},
			handler(code) {
				return `window.dispatchEvent(new Event('moduleRequested'));
${code};
window.dispatchEvent(new Event('moduleLoaded'));`;
			},
		},
	} satisfies Plugin;
}
