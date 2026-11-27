import ts from 'typescript';
import { normalizePath, type Plugin, type FilterPattern } from 'vite';
import { excludeVirtualModules } from '../utils/filter';

type PartialArray<T> = T extends (infer U)[] ? (U | false)[]
	: never;

type PartialArrayProperties<T> = {
	[K in keyof T]: PartialArray<T[K]>;
};

function clearFalsyArrayEntries<T>(value: PartialArrayProperties<T>) {
	return Object.fromEntries(Object.entries(value).map(([key, value]) => [
		key,
		Array.isArray(value)
			? value.filter(Boolean)
			: value,
	])) as T;
}

export default function typescriptTransformPlugin(options: {
	include?: FilterPattern;
	exclude?: FilterPattern;
	transformers: PartialArrayProperties<ts.CustomTransformers>;
}) {
	return {
		name: 'typescript-transform',
		// run before esbuild transforms typescript to javascript
		enforce: 'pre',
		transform: {
			filter: {
				id: excludeVirtualModules({
					include: options.include,
					exclude: options.exclude,
				}),
				moduleType: ['ts', 'tsx'],
			},
			handler(code: string, id: string) {
				const result = ts.transpileModule(code, {
					fileName: normalizePath(id).split('/').pop(),
					compilerOptions: {
						module: ts.ModuleKind.ESNext,
						// workaround for https://github.com/oxc-project/oxc/issues/9170
						// target ES2022 so typescript transforms es decorators
						target: ts.ScriptTarget.ES2022,
						sourceMap: true,
					},
					transformers: clearFalsyArrayEntries(options.transformers),
				});

				return {
					code: result.outputText,
					map: result.sourceMapText,
					moduleType: 'js',
				};
			},
		},
	} satisfies Plugin;
}
