import { type FilterPattern, type Plugin } from 'vite';
import { excludeVirtualModules } from '../utils/filter';

export default function(options: {
	include: FilterPattern;
	exclude?: FilterPattern;
}) {
	return {
		name: 'override-side-effects-plugin',
		apply: 'build',
		transform: {
			filter: {
				id: excludeVirtualModules({
					include: options.include,
					exclude: options.exclude,
				}),
			},
			handler() {
				return {
					moduleSideEffects: false,
				};
			},
		},
	} satisfies Plugin;
}
