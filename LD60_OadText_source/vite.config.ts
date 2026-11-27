import { defineConfig } from 'vite';
import { playwright } from '@vitest/browser-playwright';

import htmlPlugin from './vite/plugins/htmlPlugin';
import overrideSideEffectsPlugin from './vite/plugins/overrideSideEffectsPlugin';
import typescriptTransformPlugin from './vite/plugins/typescriptTransformPlugin';
import generateDeclarationsPlugin from './vite/plugins/generateDeclarationsPlugin';
import devHooksPlugin from './vite/plugins/devHooksPlugin';
import artifactsPlugin from './vite/plugins/artifactsPlugin';
import concurrentTopLevelAwait from 'rolldown-plugin-concurrent-top-level-await';

import proxyExtensionPlugin from './vite/plugins/proxyExtensionPlugin';
import fontPlugin from './vite/plugins/fontPlugin';
import bitmapFontPlugin from './vite/plugins/bitmapFontPlugin';
import spritesheetPlugin from './vite/plugins/spritesheetPlugin';
import asepritePlugin from './vite/plugins/asepritePlugin';
import pyxelPlugin from './vite/plugins/pyxelPlugin';
import mediaConvertPlugin from './vite/plugins/mediaConvertPlugin';
import pixiAssetPlugin from './vite/plugins/pixiAssetPlugin';
import pixiReactExtendPlugin from './vite/plugins/pixiReactExtendPlugin';
import progressPlugin from './vite/plugins/progressPlugin';
import tiledPlugin from './vite/plugins/tiledPlugin';
import textPlugin from './vite/plugins/textPlugin';

import customAsyncRuntimeTransformer from './typescript-transformer/customAsyncRuntimeTransformer';
import hotReplacementTransformer from './typescript-transformer/hotReplacementTransformer';

import appConfig from './src/app.json';

export default defineConfig((env) => ({
	// itch.io requires relative paths to be used
	base: '',
	server: {
		port: 8080,
	},
	define: {
		__DEV__: env.mode === 'development',
	},
	css: {
		transformer: 'lightningcss',
	},
	build: {
		target: 'es2022',
		cssMinify: 'lightningcss',
	},
	resolve: {
		tsconfigPaths: true,
	},
	plugins: [
		htmlPlugin({
			title: appConfig.title,
			favicon: 'assets/logos/favicon.svg',
		}),
		overrideSideEffectsPlugin({
			include: 'node_modules/stats.js/build/stats.min.js',
		}),

		typescriptTransformPlugin({
			exclude: 'node_modules/**/*',
			transformers: {
				before: [
					customAsyncRuntimeTransformer('engine/Runtime/__internal/customAsyncRuntime.ts'),
					env.mode === 'development' && hotReplacementTransformer(true),
				],
			},
		}),
		devHooksPlugin({
			'itch.io': appConfig['itch.io'],
			testEnvironment: 'test-environment',
		}),
		artifactsPlugin({
			folder: `bin/LD${appConfig.ludumDare}`,
			zipFileName: `LD${appConfig.ludumDare}_${appConfig.title}.zip`,
			sourceFileName: `LD${appConfig.ludumDare}_${appConfig.title}_source.zip`,
		}),

		generateDeclarationsPlugin({
			directories: [
				'src',
				'assets',
			],
			queryParameters: [
				['**/*.json', ['spritesheet']],
			],
		}),
		proxyExtensionPlugin({
			include: '**/*.json?spritesheet',
			proxyExtension: 'spritesheet',
		}),
		fontPlugin({
			include: '**/*.{ttf,woff,woff2}',
		}),
		bitmapFontPlugin({
			include: '**/fonts/**/*.png',
			lineHeight: 14,
			charset:
				' ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!"#$%&\'()*+,-./:;<=>?@[\\]^_`{|}~',
		}),
		// esbuild processes json files differently which leads to HMR issues
		spritesheetPlugin({
			// match by query param for type generation
			include: '**/*.*?spritesheet',
			getJsonPath(id) {
				return id.split('?')[0].replace('.spritesheet', '');
			},
		}),
		asepritePlugin({
			shapePadding: 1,
		}),
		pyxelPlugin({
			shapePadding: 1,
		}),
		mediaConvertPlugin({
			include: '**/*.{ogg,wav,mp3}',
			formatPriority: {
				ogg: ['ogg', 'wav < 4 mB', 'mp3', 'wav'],
				mp3: ['mp3', 'ogg', 'wav'],
				wav: ['ogg', 'wav < 4 mB', 'mp3', 'wav'],
			},
		}),
		pixiAssetPlugin({
			include: [
				'**/*.{jpg,jpeg,png,avif,webp}',
				'**/*.{*?spritesheet,aseprite,pyxel}',
				'**/*.{ogg,wav,mp3}',
			],
		}),
		pixiReactExtendPlugin({
			componentModule: 'engine/View/__components',
			include: '**/*.tsx',
			// matches jsx(), jsxDEV(), jsxs(), ...
			componentMatcher: /jsx[a-zA-Z]*\(\s*"([a-zA-Z0-9]+)"/g,
			componentFilter: (name) => /^(pixi)|(layout)[A-Z]/.test(name),
		}),
		progressPlugin({
			include: [
				'**/*.{ttf,woff,woff2}',
				'**/*.{jpg,jpeg,png,avif,webp}',
				'**/*.{*?spritesheet,aseprite,pyxel}',
				'**/*.{ogg,wav,mp3}',
			],
		}),
		tiledPlugin({
			transformers: {
				properties(properties) {
					return Object.fromEntries(properties.map(p => [p.name, p.value]));
				},
			},
		}),
		textPlugin({
			include: '**/*.{txt,vert,frag}',
			// .txt files are handled as assets by vite
			enforce: 'pre',
		}),
		concurrentTopLevelAwait(),
	],
	test: {
		environment: 'happy-dom',
		include: ['test/**/*.ts'],
		includeSource: ['src/**/*.ts(x)?'],
		exclude: ['test/__**', 'test/tiled/**'],

		browser: {
			provider: playwright(),
			headless: true,
			screenshotFailures: false,
			instances: [
				{ browser: 'chromium' },
				{ browser: 'firefox' },
			],
		},
	},
}));
