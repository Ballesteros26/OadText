import path from 'node:path';
import fs from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import { spawn } from 'node:child_process';

import { createLogger, type Logger, type Plugin, type Rolldown } from 'vite';
import archiver from 'archiver';

const name = 'artifacts-plugin';

function sanitizeFilename(name: string) {
	return name.replace(/[^a-z0-9\.]/gi, '_');
}

export default function artifactsPlugin(options: {
	folder: string;
	zipFileName: string;
	sourceFileName: string;
}) {
	let logger: Logger | null = null;

	let folderPromise: Promise<string>;
	let zipPromise: Promise<void>;
	let sourcePromise: Promise<void>;

	return {
		name,
		apply: 'build',
		configResolved(config) {
			logger = createLogger(config.logLevel, {
				prefix: `[${name}]`,
			});

			const sanitizedFolder = options.folder.split('/')
				.map(sanitizeFilename)
				.join('/');

			const folderPath = path.isAbsolute(sanitizedFolder)
				? sanitizedFolder
				: path.join(config.root, sanitizedFolder);

			folderPromise = fs.mkdir(folderPath, { recursive: true })
				.then(() => folderPath);
		},
		buildStart() {
			sourcePromise = folderPromise.then((folderPath) => {
				return archiveSource(
					path.join(folderPath, sanitizeFilename(options.sourceFileName)),
					logger!,
				);
			});
		},
		writeBundle(_, bundle) {
			zipPromise = folderPromise.then((folderPath) => {
				return archiveBuild(
					path.join(folderPath, sanitizeFilename(options.zipFileName)),
					bundle,
					logger!,
				);
			});
		},
		async closeBundle() {
			await Promise.all([
				zipPromise,
				sourcePromise,
			]);

			logger!.info(`artifacts created in ${await folderPromise}`, {
				timestamp: true,
			});
		},
	} satisfies Plugin;
}

async function archiveBuild(path: string, bundle: Rolldown.OutputBundle, logger: Logger) {
	await new Promise((res, rej) => {
		const output = createWriteStream(path);
		const archive = archiver.create('zip');

		archive.on('warning', function(err) {
			if (err.code === 'ENOENT') {
				logger.warn(err, {
					timestamp: true,
				});
			} else {
				rej(err);
			}
		});
		output.on('close', res);
		archive.on('error', rej);

		archive.pipe(output);
		for (const file of Object.values(bundle)) {
			archive.append(file.type === 'asset' ? file.source : file.code, {
				name: file.fileName,
			});
		}
		archive.finalize();
	});
}

async function archiveSource(path: string, logger: Logger) {
	await new Promise((res, rej) => {
		const ls = spawn('git', ['archive', '-o', path, 'HEAD']);

		ls.stderr.on('data', data => {
			data
				.toString()
				.split('\n')
				.forEach((line) => {
					if (!line.trim().length) {
						return;
					}
					logger.warn(line, {
						timestamp: true,
					});
				});
		});

		ls.on('close', res);
		ls.on('error', rej);
	});
}
