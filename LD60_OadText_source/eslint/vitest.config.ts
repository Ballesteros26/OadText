/// <reference types="vitest" />
import { defineConfig } from 'vite';

export default defineConfig({
	test: {
		globals: true,
		include: ['eslint/tests/**/*.test.ts'],
	},
});
