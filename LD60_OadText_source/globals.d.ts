// don't import complete client.d.ts file because it defines invalid modules
/// <reference path="./node_modules/vite/types/importMeta.d.ts" />
/// <reference path="./node_modules/@total-typescript/ts-reset/dist/recommended.d.ts" />

declare const __DEV__: boolean;

// Vite modules
declare module '*.css' {}

declare module '*?raw' {
	const src: string;
	export default src;
}
declare module '*?url' {
	const src: string;
	export default src;
}
declare module '*?inline' {
	const src: string;
	export default src;
}
