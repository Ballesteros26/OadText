import { extensions, loadTextures } from 'pixi.js';
import { loadPixelEditorFile } from 'engine/Game/extensions/loadPixelEditorFile';

if (import.meta.hot) {
	// HMR of BaseTextures requires them to use Image for their source
	loadTextures.config!.preferCreateImageBitmap = false;
}
extensions.add(loadPixelEditorFile);
