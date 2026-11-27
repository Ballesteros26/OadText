import { type FilterPattern } from 'vite';

function ensureArray<T>(pattern: T | T[] | undefined | null): T[] {
	if (pattern == null) {
		return [];
	}
	if (Array.isArray(pattern)) {
		return pattern;
	}
	return [pattern];
}

/**
 * Imitates the behavior of Rollup's `createFilter` to ignore files containing `\0`.
 */
export function excludeVirtualModules(filter: {
	include?: FilterPattern | null;
	exclude?: FilterPattern | null;
}): {
	include: string | RegExp | (string | RegExp)[];
	exclude: string | RegExp | (string | RegExp)[];
} {
	return {
		include: filter.include ?? undefined,
		exclude: [/\0/, ...ensureArray(filter.exclude)],
	};
}
