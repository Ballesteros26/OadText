import fs from 'node:fs/promises';
import path from 'node:path';

import { createFilter, createLogger, type FilterPattern, type Logger, type Plugin } from 'vite';

import { glob } from 'glob';
import chokidar from 'chokidar';

type Typing = {
	kind: 'NEVER';
} | {
	kind: 'ASSET';
	comment?: string;
	extension: string | string[];
	meta?: unknown;
} | {
	kind: 'TS_TYPE';
	imports?: string[];
	comment?: string;
	type: string;
};

type OptionalAsync<T> = T | Promise<T>;

declare module 'vite' {
	interface Plugin {
		typing?: {
			load?(id: string): OptionalAsync<Typing | null | void>;
			transform?(type: Typing, id: string): OptionalAsync<Typing | null | void>;
		};
	}
}

type QueryParametersFilter = (readonly [(id: unknown) => boolean, string[]])[];

const name = 'generate-declarations-plugin';

const resourceQueryFallbackPath = 'resourceQueryFallback.d.ts';

const imageExtensions = new Set([
	'apng',
	'bmp',
	'png',
	'jpg',
	'jpeg',
	'jfif',
	'pjpeg',
	'pjp',
	'gif',
	'svg',
	'ico',
	'webp',
	'avif',
]);

export default function generateDeclarationsPlugin(options: {
	directories: string[];
	queryParameters: [FilterPattern, string[]][];
}) {
	const directoriesGlob = `{${options.directories.join(',')}}`;
	const queryParametersFilter = options.queryParameters
		.map(([include, params]) => [createFilter(include), params] as const);

	let watcherPromise: Promise<chokidar.FSWatcher> | null = null;
	let plugins: Plugin[];
	let logger: Logger;

	return {
		name,
		apply: 'serve',
		configResolved(resolvedConfig) {
			logger = createLogger(resolvedConfig.logLevel, {
				prefix: `[${name}]`,
			});
			const filteredPlugins = resolvedConfig.plugins
				.filter(({ typing }) => typing != null);
			plugins = [
				...filteredPlugins.filter(({ enforce }) => enforce === 'pre'),
				{
					name: 'asset-typing-plugin',
					typing: {
						load(id) {
							if (resolvedConfig.assetsInclude(id)) {
								const extension = path.extname(id).slice(1);
								return {
									kind: 'ASSET',
									comment: imageExtensions.has(extension)
										? `![preview](${path.resolve(resolvedConfig.root, id)})`
										: undefined,
									extension,
								};
							}
						},
					},
				},
				...filteredPlugins.filter(({ enforce }) => enforce == null),
				...filteredPlugins.filter(({ enforce }) => enforce === 'post'),
			];
		},
		buildStart() {
			if (this.meta.watchMode) {
				watcherPromise = watch(directoriesGlob, queryParametersFilter, plugins, logger);
				watcherPromise.then(() => {
					logger?.info('Type declarations generated', {
						timestamp: true,
					});
				});
			}
		},
		async buildEnd() {
			if (watcherPromise) {
				const watcher = await watcherPromise;
				await watcher.close();
			}
		},
	} satisfies Plugin;
}

const ignorePattern = '**/*.{ts,tsx,mts,cts}?(.map)';

const areQuestionmarksAllowedInFilenames = process.platform !== 'win32';

async function watch(
	directoriesGlob: string,
	queryParametersFilter: QueryParametersFilter,
	plugins: Plugin[],
	logger: Logger,
) {
	let promises: Promise<void>[] | null = [];

	promises.push(deleteUnusedDeclarationFiles(directoriesGlob, queryParametersFilter, logger)
		.catch((error) => {
			logger?.error('Could not remove unused typing files', {
				error,
				timestamp: true,
			});
		}));

	promises.push(generateDeclarationFallback()
		.catch((error) => {
			logger?.error('Could not generate resourceQuery fallback', {
				error,
				timestamp: true,
			});
		}));

	const watcher = chokidar.watch(`${directoriesGlob}/**/*.*`, {
		ignored: ignorePattern,
	});

	await new Promise<void[]>((res, rej) => {
		watcher
			.on('add', (filename) => {
				const promise = writeTypings(filename, queryParametersFilter, plugins, logger, promises != null);
				promises?.push(promise);
			})
			.on('change', (filename) => {
				const promise = writeTypings(filename, queryParametersFilter, plugins, logger, true);
				promises?.push(promise);
			})
			.on('unlink', (filename) => removeTypings(filename, queryParametersFilter, logger))
			.on('ready', () => {
				res(Promise.all(promises!));
				promises = null;
			})
			.on('error', rej);
	});

	return watcher;
}

function invertQueryParameterFilter(queryParametersFilter: QueryParametersFilter) {
	const inverted = new Map<string, ((id: unknown) => boolean)[]>();

	for (const [filter, queries] of queryParametersFilter) {
		for (const query of queries) {
			if (!inverted.has(query)) {
				inverted.set(query, []);
			}
			inverted.get(query)!.push(filter);
		}
	}
	return inverted;
}

function parseTypingPath(typingPath: string) {
	const match = /^(.*)\.d(\.[^\/\?]+)\??([^\/]*)\.ts$/.exec(typingPath);
	if (match == null) {
		return null;
	}
	const [_, path, extension, query] = match;
	return {
		assetPath: `${path}${extension}`,
		query: query || null,
	};
}

async function deleteUnusedDeclarationFiles(
	directoriesGlob: string,
	queryParametersFilter: QueryParametersFilter,
	logger: Logger,
) {
	const files = await glob([
		resourceQueryFallbackPath,
		directoriesGlob + '/**/*.!(ts|tsx)',
		directoriesGlob + '/**/*.d.*.ts?(.map)',
	], {
		nodir: true,
	});
	const filesSet = new Set(files);
	const invertedQueryParameterFilter = invertQueryParameterFilter(queryParametersFilter);
	const promises: Promise<void>[] = [];

	for (const file of files) {
		// resourceQueryFallbackPath
		if (file === resourceQueryFallbackPath && areQuestionmarksAllowedInFilenames) {
			promises.push(unlinkIgnoringMissingFile(file).then(() => {}));
		}

		// .map
		const isMap = file.endsWith('.map');
		const typingPath = isMap
			? file.slice(0, -4)
			: file;
		if (isMap && filesSet.has(typingPath)) {
			continue;
		}

		// .d.*.ts
		const parsedPath = parseTypingPath(typingPath);
		if (parsedPath == null) {
			continue;
		}
		const { assetPath, query } = parsedPath;

		if (!filesSet.has(assetPath)) {
			promises.push(unlinkDeclarationAndMapFile(typingPath, logger));
		}
		if (query && !invertedQueryParameterFilter.get(query)?.some((filter) => filter(assetPath))) {
			promises.push(unlinkDeclarationAndMapFile(typingPath, logger));
		}
	}
	await Promise.all(promises);
}

async function generateDeclarationFallback() {
	if (!areQuestionmarksAllowedInFilenames) {
		// TODO generate content dynamically
		await writeFile(
			resourceQueryFallbackPath,
			`declare module "*.json?spritesheet" {
const content: import("pixi.js").Spritesheet;
export default content;
}`,
			true,
		);
	}
}

async function generateTyping(id: string, plugins: Plugin[]) {
	let typing: Typing | null = null;
	for (const plugin of plugins) {
		if (plugin.typing?.load) {
			const loaded = await plugin.typing.load(id);
			if (loaded != null) {
				typing = loaded;
				break;
			}
		}
	}

	if (typing == null || typing.kind === 'NEVER') {
		return null;
	}

	for (const plugin of plugins) {
		if (plugin.typing?.transform) {
			const transformed = await plugin.typing.transform(typing, id);
			if (transformed != null) {
				typing = transformed;
				if (typing.kind === 'NEVER') {
					return null;
				}
			}
		}
	}

	return typing;
}

function renderTyping(typing: Awaited<ReturnType<typeof generateTyping>>, moduleName: string): string | null {
	if (typing == null) {
		return null;
	}
	if (typing.kind === 'ASSET') {
		return renderTyping({
			kind: 'TS_TYPE',
			comment: typing.comment,
			type: Array.isArray(typing.extension)
				? 'string[]'
				: 'string',
		}, moduleName);
	}
	let comment: string | undefined;
	if (typing.comment) {
		comment = [
			[
				'/**',
				...typing.comment
					// prevent escaping comment
					.replaceAll('*/', '* /')
					.split('\n'),
			].join('\n * '),
			' */',
		].join('\n');
	}
	return [
		typing.imports?.join('\n'),
		comment,
		`declare let ${moduleName}: ${typing.type};`,
		`export default ${moduleName};`,
	].filter(Boolean).join('\n');
}

function getQueryParameters(filename: string, queryParametersFilter: QueryParametersFilter) {
	return [
		undefined,
		...queryParametersFilter
			.filter(([filter]) => filter(filename))
			.flatMap(([_, params]) => params),
	];
}

function getId(filename: string, queryParam: string | undefined) {
	return queryParam
		? `${filename}?${queryParam}`
		: filename;
}

function getTypingPath(pathString: string, query?: string) {
	const parsedPath = path.parse(pathString);

	return path.format({
		...parsedPath,
		base: undefined,
		ext: query == null
			? `.d${parsedPath.ext}.ts`
			: `.d${parsedPath.ext}?${query}.ts`,
	});
}

async function writeTypings(
	filename: string,
	queryParametersFilter: QueryParametersFilter,
	plugins: Plugin[],
	logger: Logger,
	skipIfUnchanged: boolean,
	throwOnError = false,
) {
	const consideredQueryParameters = getQueryParameters(filename, queryParametersFilter);

	await Promise.all(consideredQueryParameters.map(async (query) => {
		const id = getId(filename, query);
		const typingsFilename = getTypingPath(filename, query);

		try {
			const typings = renderTyping(await generateTyping(id, plugins), pathToJsName(filename));

			if (typings == null) {
				return unlinkDeclarationAndMapFile(typingsFilename, logger)
					.catch(() => {});
			}

			const change: FileChange = Math.max(...await Promise.all([
				writeFile(typingsFilename, typings, skipIfUnchanged),
				writeFile(
					`${typingsFilename}.map`,
					generateSourceMapContent(typingsFilename, filename),
					skipIfUnchanged,
				).catch(() => FileChange.SKIPPED),
			]));

			if (change === FileChange.SKIPPED) {
				return;
			}

			logger?.info(`${change === FileChange.UPDATED ? 'Updated' : 'Created'} ${typingsFilename}`, {
				timestamp: true,
			});
		} catch (err) {
			logger?.error(err, {
				timestamp: true,
			});
			if (throwOnError) {
				throw err;
			}
		}
	}));
}

function removeTypings(path: string, queryParametersFilter: QueryParametersFilter, logger: Logger) {
	const queryParams = getQueryParameters(path, queryParametersFilter);

	queryParams.forEach(async (query) => {
		const filename = getTypingPath(path, query);
		unlinkDeclarationAndMapFile(filename, logger)
			.catch(err =>
				logger?.error(err, {
					timestamp: true,
				})
			);
	});
}

/**
 * generate source map definition for Visual Studio Code's "Go to definition"
 */
function generateSourceMapContent(typingsFile: string, assetFile: string) {
	return JSON.stringify(
		{
			version: 3,
			file: path.basename(typingsFile),
			sources: [path.basename(assetFile)],
			names: [],
			mappings: ';;;;;;IAAA;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;',
		},
		null,
		'\t',
	);
}

const enum FileChange {
	SKIPPED = 0,
	UPDATED = 1,
	CREATED = 2,
}

async function writeFile(file: string, content: string, skipIfUnchanged: boolean) {
	let updating = skipIfUnchanged;
	if (skipIfUnchanged) {
		try {
			const currentContent = await fs.readFile(file, {
				encoding: 'utf-8',
			});
			if (currentContent === content) {
				return FileChange.SKIPPED;
			}
		} catch (err) {
			if (err.code === 'ENOENT') {
				updating = false;
			}
			// ignore other errors
		}
	}
	await fs.writeFile(file, content);
	return updating
		? FileChange.UPDATED
		: FileChange.CREATED;
}

function unlinkIgnoringMissingFile(path: string) {
	return fs
		.unlink(path)
		.then(() => true)
		.catch(err => {
			if (err.code === 'ENOENT') {
				return false;
			}
			throw err;
		});
}

async function unlinkDeclarationAndMapFile(typingPath: string, logger: Logger) {
	const success = await Promise.all([
		unlinkIgnoringMissingFile(typingPath),
		unlinkIgnoringMissingFile(`${typingPath}.map`),
	]);
	if (success.some(Boolean)) {
		logger?.info(`Removed ${typingPath}`, {
			timestamp: true,
		});
	}
}

function pathToJsName(filename: string) {
	// $ ensures name is not empty and not a reserved word
	return `$${path.parse(filename).name.replace(/[^a-zA-Z0-9_$]/g, '_')}`;
}
