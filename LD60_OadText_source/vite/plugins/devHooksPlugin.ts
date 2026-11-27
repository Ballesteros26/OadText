import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';

import { createLogger, type ViteDevServer, type Logger, type Plugin, type WebSocketClient, build } from 'vite';
import launch from 'launch-editor';

type ItchioConfig = {
	user: string;
	game: string;
};

type Context = {
	'itch.io': ItchioConfig;
	testEnvironment?: string;
	logger: Logger;
	server: ViteDevServer;
};

const name = 'dev-hooks-plugin';

function sendAnswerToClient(
	ctx: Context,
	cb: (ctx: Context, data, opts: {
		confirm: (msg: string) => Promise<boolean>;
	}) => Promise<{
		msg?: string;
		url?: string;
	}>,
) {
	return async (data, client: WebSocketClient) => {
		function confirm(msg: string) {
			return new Promise<boolean>((res) => {
				client.send('dev-hooks:confirm', msg);
				const cb = (confirmed: boolean) => {
					res(confirmed);
					ctx.server.ws.off('dev-hooks:confirm', cb);
				};
				// TODO only listen to events from client
				// TODO listen for disconnect events
				ctx.server.ws.on('dev-hooks:confirm', cb);
			});
		}
		try {
			const { msg, url } = await cb(ctx, data, { confirm });
			if (msg) {
				ctx.logger?.info(msg, {
					timestamp: true,
				});
				client.send('dev-hooks:message', msg);
			}
			if (url) {
				client.send('dev-hooks:open-url', url);
			}
		} catch (error) {
			const message = error?.message ?? error;
			ctx.logger?.error(message, {
				timestamp: true,
				error: error,
			});
			client.send('dev-hooks:error', message);
		}
	};
}

export default function devHooksPlugin(options: {
	'itch.io': ItchioConfig;
	testEnvironment?: string;
}) {
	const ctx: Context = {
		'itch.io': options['itch.io'],
		testEnvironment: options.testEnvironment,
		logger: undefined as any,
		server: undefined as any,
	};

	return {
		name,
		apply: 'serve',
		configResolved(resolvedConfig) {
			ctx.logger = createLogger(resolvedConfig.logLevel, {
				prefix: `[${name}]`,
			});
		},
		configureServer(server) {
			ctx.server = server;
			server.ws.on('dev-hooks:publish', sendAnswerToClient(ctx, publish));
			server.ws.on('dev-hooks:screenshot', sendAnswerToClient(ctx, mkScreenshot));
			server.ws.on('dev-hooks:artifacts', sendAnswerToClient(ctx, createArtifacts));
			server.ws.on('dev-hooks:docs', sendAnswerToClient(ctx, serveDocs));
			server.ws.on('dev-hooks:open-file', (file: string) => launch(file));
		},
	} satisfies Plugin;
}

async function publish(ctx: Context, _, { confirm }) {
	ctx.logger?.info('publishing...', {
		timestamp: true,
	});

	const itchConfig = ctx['itch.io'];

	if (!(itchConfig && itchConfig.user && itchConfig.game)) {
		throw new Error('No valid itch.io configuration');
	}

	const uploadPath = `${itchConfig.user}/${itchConfig.game}:HTML5`;

	const confirmMsg = `Game will be uploaded to \`${uploadPath}\``;
	if (itchConfig.game !== ctx.testEnvironment && !await confirm(confirmMsg)) {
		return {
			msg: 'Upload aborted',
		};
	}

	await generateProductionBuild(ctx);

	return new Promise<{ msg: string }>((res, rej) => {
		// https://stackoverflow.com/questions/20643470/execute-a-command-line-binary-with-node-js
		const ls = spawn('butler', ['push', 'dist', uploadPath]);

		ls.stdout.on('data', data => {
			console.log(data.toString());
		});
		ls.stderr.on('data', data => {
			console.log(`stderr: ${data}`);
		});
		ls.on('close', () => {
			res({
				msg: 'Application uploaded to itch.io',
			});
		});
		ls.on('error', err => {
			rej(err);
		});
	});
}

let screenshotsInSec = 0;
let secondOfLatestScreenshot = 0;

async function mkScreenshot(ctx: Context, dataURL: string) {
	// extract data
	const base64Data = dataURL.replace(/^data:image\/png;base64,/, '');
	// create screenshotname
	const now = new Date();
	const currentSecond = now.valueOf() / 1000 | 0;
	if (currentSecond === secondOfLatestScreenshot) {
		screenshotsInSec++;
	} else {
		screenshotsInSec = 0;
		secondOfLatestScreenshot = currentSecond;
	}
	let name = now.toJSON();
	name = name.slice(0, -5);
	name = name.replace(/T/g, '_');
	name = name.replace(/:/g, '.');
	name += screenshotsInSec > 0 ? `_${screenshotsInSec}` : '';

	await fs.mkdir('screenshots', { recursive: true });
	await fs.writeFile(path.join('screenshots', name + '.png'), base64Data, 'base64');

	return {
		msg: 'Screenshot taken',
	};
}

async function createArtifacts(ctx: Context) {
	await generateProductionBuild(ctx);

	return {
		msg: 'artifacts created',
	};
}

let docsUrl: Promise<string> | null = null;

async function serveDocs() {
	if (docsUrl == null) {
		docsUrl = getDocsUrlPromise();
	}

	const url = await docsUrl;
	return {
		msg: `Serving docs at ${url}`,
		url,
	};
}

const urlMatcher = '➜  Local:';
function getDocsUrlPromise() {
	return new Promise<string>((res, rej) => {
		const ls = spawn('npm', ['run', 'docs:dev']);

		ls.stdout.on('data', data => {
			for (const line of data.toString().split('\n')) {
				if (line.trim().startsWith(urlMatcher)) {
					const url = line
						.slice(line.indexOf(urlMatcher) + urlMatcher.length)
						.trim();
					res(url);
				}
			}
		});

		ls.on('error', rej);

		ls.stderr.on('data', data => {
			console.error(data.toString());
		});

		ls.on('close', () => {
			rej(new Error('Could not serve docs.'));
		});
	});
}

function generateProductionBuild(ctx: Context) {
	return build()
		.catch(e => {
			ctx.logger.error(e, {
				timestamp: true,
			});
			throw new Error('Could not generate production build');
		});
}
