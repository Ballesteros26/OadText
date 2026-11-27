import { createLogger, normalizePath, type Logger, type Plugin } from 'vite';
import { type PluginContext } from 'rolldown';
import path from 'node:path';

export default function getAssetHandler(pluginName: string) {
	const servePath = `${pluginName}-assets`;

	let isServe: boolean;
	let root: string;
	let logger: Logger;

	const cache = new Map<string, Promise<string | Uint8Array>>();

	async function designateAsset(
		context: PluginContext,
		id: string,
		source: string | Uint8Array | Promise<string | Uint8Array>,
	) {
		if (isServe) {
			if (source instanceof Promise) {
				// prevent dev server from crashing
				source.catch(error => {
					logger.error(error?.msg ?? error, {
						timestamp: true,
						error,
					});
				});
			}
			const serveId = normalizePath(`${servePath}/${path.relative(root, id)}`);
			cache.set(`/${serveId}`, Promise.resolve(source));
			return {
				javascriptIdentifier: `"${serveId}"`,
				assetPath: serveId,
			};
		}
		const referenceId = context.emitFile({
			type: 'asset',
			name: path.basename(id),
			source: await source,
		});

		const assetPath = context.getFileName(referenceId);

		return {
			javascriptIdentifier: `import.meta.ROLLUP_FILE_URL_${referenceId}`,
			// TODO javascriptIdentifier is absolute, assetPath is not
			assetPath,
		};
	}
	return {
		designateAsset,
		plugin: {
			name: `${pluginName}-asset-handler`,
			configResolved(resolvedConfig) {
				isServe = resolvedConfig.command === 'serve';
				root = resolvedConfig.root;
				logger = createLogger(resolvedConfig.logLevel, {
					prefix: `[${pluginName}-asset-handler]`,
				});
			},
			configureServer(server) {
				// in dev mode serve assets directly
				server.middlewares.use(async ({ url }, res, next) => {
					const pathname = url?.split('?')[0];
					if (pathname && cache.has(pathname)) {
						try {
							res.end(await cache.get(pathname)!);
						} catch (error: unknown) {
							res.statusCode = 500;
							const msg = error instanceof Error
								? error.message
								: typeof error === 'string'
								? error
								: undefined;
							res.setHeader('Content-Type', 'text/plain');
							res.end(msg);
						}
						return;
					}
					next();
				});
			},
		} satisfies Plugin,
	};
}
