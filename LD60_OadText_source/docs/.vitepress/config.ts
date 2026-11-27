import { defineConfig } from 'vitepress';
import { transformerTwoslash } from '@shikijs/vitepress-twoslash';

// https://vitepress.dev/reference/site-config
export default defineConfig({
	title: 'quack-engine',
	description: 'Documentation for quack-engine',
	themeConfig: {
		logo: { src: '/logo.svg', width: 24, height: 24 },
		// https://vitepress.dev/reference/default-theme-config
		nav: [
			{ text: 'Home', link: '/' },
			{ text: 'Guide', link: '/introduction/' },
		],

		sidebar: [
			{
				text: 'Introduction',
				link: '/introduction/',
				items: [
					{ text: 'Should You Consider it?', link: '/introduction/should-you-consider-it' },
					{ text: 'Getting Started', link: '/introduction/getting-started' },
					{ text: 'Scope and Goals', link: '/introduction/scope' },
				],
			},
			{
				text: 'Build Setup',
				items: [
					{ text: 'Hot Module Replacement', link: '/build-setup/hmr' },
				],
			},
			{
				text: 'Event System',
				link: '/event-system/',
				items: [
					{ text: 'EventEmitter', link: '/event-system/event-emitter' },
					{ text: 'Usage as Promises', link: '/event-system/promises' },
					{ text: 'Example: Tutorial System', link: '/event-system/tutorial-example' },
				],
			},
			{
				text: 'Runtime Modifications',
				link: '/runtime-modifications/',
				items: [
					{ text: 'ImmediatePromise in Async Functions', link: '/runtime-modifications/async-functions' },
					{ text: 'Cancellation of Async Functions', link: '/runtime-modifications/async-cancellation' },
				],
			},
		],

		socialLinks: [
			{ icon: 'github', link: 'https://github.com/zOadT/quack-engine' },
		],
	},
	markdown: {
		codeTransformers: [
			transformerTwoslash(),
		],
	},
});
