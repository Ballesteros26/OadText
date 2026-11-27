import { ExtensionType, Spritesheet, type LoaderParser, type ResolvedAsset } from 'pixi.js';
import { PixelEditorFile, type PixelSpritesheetData } from 'engine/Fileschemes/PixelEditorFile';

/**
 * Loader plugin that turns sprite sheets from aseprite and pyxel files into a {@link PixelEditorFile}.
 */
export const loadPixelEditorFile = {
	extension: ExtensionType.LoadParser,

	async testParse(asset: any, options: ResolvedAsset): Promise<boolean> {
		return asset instanceof Spritesheet && asset.data.meta.editorData;
	},

	async parse(asset: Spritesheet<PixelSpritesheetData>): Promise<PixelEditorFile> {
		return new PixelEditorFile(asset);
	},

	unload(spritesheet: PixelEditorFile) {
		// TODO
		// spritesheet.destroy(true);
	},
} as LoaderParser;
