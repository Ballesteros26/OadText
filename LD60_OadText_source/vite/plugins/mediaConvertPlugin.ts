/// <reference path="generateDeclarationsPlugin.ts" />

import path from 'node:path';
import { spawn } from 'node:child_process';
import { type Readable } from 'node:stream';
import { buffer } from 'node:stream/consumers';
import fs from 'node:fs/promises';

import { type FilterPattern, type Logger, type Plugin, createFilter, createLogger } from 'vite';
import getAssetHandler from '../utils/getAssetHandler';
import { excludeVirtualModules } from '../utils/filter';

// We don't expect large audio files any time soon. But if there are problems
// with large files the conversion can be moved into a plugin that converts the
// files directly in the dist (resp. dev) folder. For now we want to avoid
// unnecessary complexity.

const regexp = /^([a-z][a-z0-9]+)(?:\s*<\s*(\d+)\s*(bytes|kB|mB))?$/;

type Options = {
	formatPriority: Record<string, string[]>;
};

const name = 'media-convert-plugin';

export default function mediaConvertPlugin(options: {
	include?: FilterPattern;
	exclude?: FilterPattern;
	formatPriority: Record<string, string[]>;
}) {
	const filter = createFilter(
		options.include ?? '**/*.{ogg,wav,mp3}',
		options.exclude,
	);

	const {
		designateAsset,
		plugin,
	} = getAssetHandler(name);

	let isServe: boolean;
	let logger: Logger | null = null;
	let ffmpegMissingLogged = false;

	function logConvertionError(error: Error): never {
		if (error.code === 'ENOENT' && error.path === 'ffmpeg') {
			if (!ffmpegMissingLogged) {
				logger!.warn('Install ffmpeg for automatic audio file conversion', {
					timestamp: true,
				});
				ffmpegMissingLogged = true;
			}
		} else {
			logger!.error(error.message, {
				error: error,
				timestamp: true,
			});
		}
		throw error;
	}

	return [
		plugin,
		{
			name: name,
			enforce: 'pre',
			configResolved(resolvedConfig) {
				isServe = resolvedConfig.command === 'serve';
				logger = createLogger(resolvedConfig.logLevel, {
					prefix: `[${name}]`,
				});
			},
			load: {
				filter: {
					id: excludeVirtualModules({
						include: options.include ?? '**/*.(ogg|wav|mp3)',
						exclude: options.exclude,
					}),
				},
				async handler(id) {
					const sourceFormat = path.extname(id).slice(1);
					const formatPriority = getFormatPriority(sourceFormat, options);
					if (!formatPriority || formatPriority.length === 0) {
						throw new Error(`No output formats defined for '.${sourceFormat}'`);
					}

					const content = fs.readFile(id);

					let formats = [...new Set(formatPriority.map(({ format }) => format))];
					let buffers = convertAudioBuffer(
						id,
						formats
							.map(format =>
								format === sourceFormat
									? null
									: format
							),
					)
						.map(promise => promise ?? content)
						.map(promise => promise.catch(logConvertionError));

					if (isServe) {
						// fallback to next buffer to prevent runtime error
						buffers = buffers.reduceRight((prev, buffer) => {
							return [buffer.catch(() => prev[0]), ...prev];
						}, [content]);
					} else {
						const filteredFormats: string[] = [];
						const filteredBuffers: Promise<Buffer>[] = [];
						const containedFormats = new Set<string>();

						const resolvedBuffers = await Promise.allSettled(buffers);
						formatPriority.forEach(({ format, limit }) => {
							if (containedFormats.has(format)) {
								return;
							}
							const index = formats.indexOf(format);
							const value = resolvedBuffers[index];
							if (value.status === 'fulfilled' && value.value.length <= limit) {
								filteredFormats.push(formats[index]);
								filteredBuffers.push(buffers[index]);
								containedFormats.add(format);
							}
						});

						// can happen for !audioFormatPriority[x].includes(x)
						if (filteredFormats.length === 0) {
							throw new Error(`Could not generate asset for ${id}`);
						}
						formats = filteredFormats;
						buffers = filteredBuffers;
					}

					const assets = await Promise.all(buffers.map((buffer, i) => {
						return designateAsset(this, `${id}.${formats[i]}`, buffer);
					}));
					const javascriptIdentifiers = assets.map(a => a.javascriptIdentifier);

					return `export default [${javascriptIdentifiers.join()}]`;
				},
			},
			typing: {
				load(id) {
					if (filter(id)) {
						const sourceFormat = path.extname(id).slice(1);
						const formatPriority = getFormatPriority(sourceFormat, options);

						return {
							kind: 'ASSET',
							extension: [...new Set(formatPriority.map(p => p.format))],
						};
					}
				},
			},
		} satisfies Plugin,
	];
}

// TODO can 'Output stream closed' still happen?
function convertAudioBuffer(
	path: string,
	targetFormats: (string | null)[],
) {
	if (targetFormats.every(f => f == null)) {
		// no convertion required
		return targetFormats;
	}

	const ffmpeg = spawn('ffmpeg', [
		'-i',
		// using a ReadStream with PassThrough to additionally load the file
		// contents results in a `Premature close` error when spawn throws
		path,
		...targetFormats.flatMap((format, i) => {
			if (format == null) return [];
			return ['-map', '0:a', '-f', format, `pipe:${i + 3}`];
		}),
	], {
		// stdin, stdout, stderr, pipe:3, pipe:4, ...
		stdio: new Array<'pipe'>(3 + targetFormats.length).fill('pipe'),
	});

	const ffmpegPromise = new Promise<void>((resolve, reject) => {
		ffmpeg.on('error', reject);
		ffmpeg.on('close', (code) => {
			if (code !== 0) {
				reject(new Error(`ffmpeg exited with code ${code}`));
			} else {
				resolve();
			}
		});
	});

	return targetFormats.map((format, i) => {
		if (format == null) return null;

		const bufferPromise = buffer(ffmpeg.stdio[i + 3] as Readable);
		return ffmpegPromise.then(() => bufferPromise);
	});
}

function getFormatPriority(format: string, { formatPriority }: Options) {
	const unitToBytes = {
		bytes: 1,
		kB: 1000,
		mB: 1000 ** 2,
	};

	return formatPriority[format]
		// input checked by schema
		?.map(value => regexp.exec(value)!)
		.map(([_, format, quantity, unit]) => ({
			format,
			limit: quantity != null
				? parseInt(quantity) * unitToBytes[unit]
				: Infinity,
		}));
}
