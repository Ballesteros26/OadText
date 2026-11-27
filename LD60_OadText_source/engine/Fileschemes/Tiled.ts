// JSON Map Format (Version 1.2)
// see http://doc.mapeditor.org/en/stable/reference/json-map-format/
declare namespace Tiled {
	interface Map {
		/** Hex-formatted color (#RRGGBB or #AARRGGBB) */
		backgroundcolor?: string;
		/** Number of tile rows */
		height: number;
		/** Length of the side of a hex tile in pixels */
		hexsidelength?: number;
		/** Whether the map has infinite dimensions */
		infinite: boolean; //TODO true macht sachen anders (nicht documentiert)
		/** Array of layers */
		layers: Layer[];
		/** Auto-increments for each layer */
		nextlayerid: number;
		/** Auto-increments for each placed object */
		nextobjectid: number;
		orientation: 'orthogonal' | 'isometric' | 'staggered' | 'hexagonal';
		/** A list of properties (name, value, type). */
		properties?: Property[];
		/** Rendering direction (orthogonal maps only) */
		renderorder?: 'right-down' | 'right-up' | 'left-down' | 'left-up'; //TODO existenz von orientation abhängig machen
		/** x or y (staggered / hexagonal maps only) */
		staggeraxis?: 'x' | 'y';
		/** odd or even (staggered / hexagonal maps only) */
		staggerindex?: 'odd' | 'even';
		/** The Tiled version used to save the file */
		tiledversion: string;
		/** Map grid height */
		tileheight: number;
		/** Array of tilesets */
		tilesets: Tileset[];
		/** Map grid width */
		tilewidth: number;
		type: 'map';
		/** The JSON format version */
		version: number; //TODO checken ob ==1
		/** Number of tile columns */
		width: number;
	}
	type Property =
		& {
			name: string;
		}
		& ({
			type: 'string' | 'file' | 'color';
			value: string;
		} | {
			type: 'int' | 'float';
			value: number;
		} | {
			type: 'bool';
			value: boolean;
		});

	type Layer = Tilelayer | Objectgroup | Imagelayer | Group;
	interface Tilelayer {
		/** Array of GIDs */
		data: number[];
		/** Row count. Same as map height for fixed-size maps. */
		height: number; // nach doc in allen
		/** Incremental id - unique across all layers */
		id: number;
		/** Name assigned to this layer */
		name: string;
		/** Value between 0 and 1 */
		opacity: number;
		/** A list of properties (name, value, type). */
		properties?: Property[];
		type: 'tilelayer';
		/** Whether layer is shown or hidden in editor */
		visible: boolean;
		/** Column count. Same as map width for fixed-size maps. */
		width: number; //nach doc in allen
		/** Horizontal layer offset in tiles. Always 0. */
		x: 0;
		/** Vertical layer offset in tiles. Always 0. */
		y: 0;
		offsetx?: number;
		offsety?: number;
	}
	interface Objectgroup {
		/** topdown (default) or index */
		draworder: 'topdown' | 'index';
		/** Incremental id - unique across all layers */
		id: number;
		/** Name assigned to this layer */
		name: number;
		/** Array of objects */
		objects: Object[];
		/** Value between 0 and 1 */
		opacity: number;
		/** A list of properties (name, value, type). */
		properties?: Property[];
		type: 'objectgroup';
		/** Whether layer is shown or hidden in editor */
		visible: boolean;
		/** Horizontal layer offset in tiles. Always 0. */
		x: 0;
		/** Vertical layer offset in tiles. Always 0. */
		y: 0;
		offsetx?: number;
		offsety?: number;
		color?: string;
	}
	interface Imagelayer {
		/** Incremental id - unique across all layers */
		id: number;
		/** Name assigned to this layer */
		name: number;
		/** Value between 0 and 1 */
		opacity: number;
		/** A list of properties (name, value, type). */
		properties?: Property[];
		type: 'imagelayer';
		/** Whether layer is shown or hidden in editor */
		visible: boolean;
		/** Horizontal layer offset in tiles. Always 0. */
		x: number;
		/** Vertical layer offset in tiles. Always 0. */
		y: number;
		offsetx?: number;
		offsety?: number;
		transparentcolor?: string;
	}
	interface Group {
		/** Incremental id - unique across all layers */
		id: number;
		layers: Layer[];
		/** Name assigned to this layer */
		name: number;
		/** Value between 0 and 1 */
		opacity: number;
		/** A list of properties (name, value, type). */
		properties?: Property[];
		type: 'group';
		/** Whether layer is shown or hidden in editor */
		visible: boolean;
		/** Horizontal layer offset in tiles. Always 0. */
		x: number;
		/** Vertical layer offset in tiles. Always 0. */
		y: number;
		offsetx?: number;
		offsety?: number;
	}

	type Object = Ellipse | Rectangle | Point | Polygon | Polyline | Text;
	interface Ellipse {
		/** Used to mark an object as an ellipse */
		ellipse: true;
		/** GID, only if object comes from a Tilemap */
		gid?: number;
		/** Height in pixels. Ignored if using a gid. */
		height: number;
		/** Incremental id - unique across all objects */
		id: number;
		/** String assigned to name field in editor */
		name: string;
		/** A list of properties (name, value, type). */
		properties?: Property[];
		/** Angle in degrees clockwise */
		rotation: number;
		/** String assigned to type field in editor */
		type: string;
		/** Whether object is shown in editor. */
		visible: boolean;
		/** Width in pixels. Ignored if using a gid. */
		width: number;
		/** x coordinate in pixels */
		x: number;
		/** y coordinate in pixels */
		y: number;
	}
	interface Rectangle {
		/** GID, only if object comes from a Tilemap */
		gid?: number; //TODO vllt nur wenns nen plankes object ist?
		/** Height in pixels. Ignored if using a gid. */
		height: number;
		/** Incremental id - unique across all objects */
		id: number;
		/** String assigned to name field in editor */
		name: string;
		/** A list of properties (name, value, type). */
		properties?: Property[];
		/** Angle in degrees clockwise */
		rotation: number;
		/** String assigned to type field in editor */
		type: string;
		/** Whether object is shown in editor. */
		visible: boolean;
		/** Width in pixels. Ignored if using a gid. */
		width: number;
		/** x coordinate in pixels */
		x: number;
		/** y coordinate in pixels */
		y: number;
	}
	interface Point {
		/** GID, only if object comes from a Tilemap */
		gid?: number; //TODO vllt nur wenns nen plankes object ist?
		/** Height in pixels. Ignored if using a gid. */
		height: number;
		/** Incremental id - unique across all objects */
		id: number;
		/** String assigned to name field in editor */
		name: string;
		/** Used to mark an object as a point */
		point: true;
		/** A list of properties (name, value, type). */
		properties?: Property[];
		/** Angle in degrees clockwise */
		rotation: number;
		/** String assigned to type field in editor */
		type: string;
		/** Whether object is shown in editor. */
		visible: boolean;
		/** Width in pixels. Ignored if using a gid. */
		width: number;
		/** x coordinate in pixels */
		x: number;
		/** y coordinate in pixels */
		y: number;
	}
	interface Polygon {
		/** GID, only if object comes from a Tilemap */
		gid?: number; //TODO vllt nur wenns nen plankes object ist?
		/** Height in pixels. Ignored if using a gid. */
		height: number;
		/** Incremental id - unique across all objects */
		id: number;
		/** String assigned to name field in editor */
		name: string;
		/** A list of x,y coordinates in pixels */
		polygon: { x; y }[];
		/** A list of properties (name, value, type). */
		properties?: Property[];
		/** Angle in degrees clockwise */
		rotation: number;
		/** String assigned to type field in editor */
		type: string;
		/** Whether object is shown in editor. */
		visible: boolean;
		/** Width in pixels. Ignored if using a gid. */
		width: number;
		/** x coordinate in pixels */
		x: number;
		/** y coordinate in pixels */
		y: number;
	}
	interface Polyline {
		/** GID, only if object comes from a Tilemap */
		gid?: number; //TODO vllt nur wenns nen plankes object ist?
		/** Height in pixels. Ignored if using a gid. */
		height: number;
		/** Incremental id - unique across all objects */
		id: number;
		/** String assigned to name field in editor */
		name: string;
		/** A list of x,y coordinates in pixels */
		polyline: { x: number; y: number }[];
		/** A list of properties (name, value, type). */
		properties?: Property[];
		/** Angle in degrees clockwise */
		rotation: number;
		/** String assigned to type field in editor */
		type: string;
		/** Whether object is shown in editor. */
		visible: boolean;
		/** Width in pixels. Ignored if using a gid. */
		width: number;
		/** x coordinate in pixels */
		x: number;
		/** y coordinate in pixels */
		y: number;
	}
	interface Text {
		/** GID, only if object comes from a Tilemap */
		gid?: number; //TODO vllt nur wenns nen plankes object ist?
		/** Height in pixels. Ignored if using a gid. */
		height: number;
		/** Incremental id - unique across all objects */
		id: number;
		/** String assigned to name field in editor */
		name: string;
		/** String key-value pairs */
		text: {
			text: string;
			/** default: 'sans-serif' */
			fontfamily?: string;
			/** default: 16 */
			pixelsize?: number;
			/** default: false */
			wrap?: boolean;
			color?: string;
			bold?: boolean;
			italic?: boolean;
			underline?: boolean;
			strikeout?: boolean;
			kerning?: boolean;
			halign?: 'left' | 'center' | 'right' | 'justify';
			/** default: 'Top' */
			valign?: 'top' | 'center' | 'bottom';
		};
		/** A list of properties (name, value, type). */
		properties?: Property[];
		/** Angle in degrees clockwise */
		rotation: number;
		/** String assigned to type field in editor */
		type: string;
		/** Whether object is shown in editor. */
		visible: boolean;
		/** Width in pixels. Ignored if using a gid. */
		width: number;
		/** x coordinate in pixels */
		x: number;
		/** y coordinate in pixels */
		y: number;
	}

	interface Tileset {
		/** The number of tile columns in the tileset */
		columns: number;
		/** GID corresponding to the first tile in the set */
		firstgid: number;
		/** See <grid> (optional) */
		grid?: object;
		/** Image used for tiles in this set */
		image?: string;
		/** Width of source image in pixels */
		imagewidth?: number;
		/** Height of source image in pixels */
		imageheight?: number;
		/** Buffer between image edge and first tile(pixels) */
		margin: number;
		/** Name given to this tileset */
		name: string;
		/** A list of properties (name, value, type). */
		properties?: Property[];
		/** Spacing between adjacent tiles in image (pixels) */
		spacing: number;
		/** Array of terrains (optional) */
		terrains?: Terrain[];
		/** The number of tiles in this tileset */
		tilecount: number;
		/** Maximum height of tiles in this set */
		tileheight: number;
		/** See <tileoffset> (optional) */
		tileoffset?: object; //TODO
		/** Array of Tiles (optional) */
		tiles?: Tile[];
		/** Maximum width of tiles in this set */
		tilewidth: number;
		/** Hex-formatted color (#RRGGBB) (optional) */
		transparentcolor?: string;
		/** tileset (for tileset files, since 1.0) */
		type?: string; //TODO
		/** Array of Wang sets (since 1.1.5) */
		wangsets?: WangSet[];
	}

	interface Tile {
		/** Array of Frames */
		animation?: Frame[];
		/** Local ID of the tile */
		id: number;
		// set when not in tileset
		/** Image representing this tile (optional) */
		image?: string;
		/** Height of the tile image in pixels */
		imageheight?: number;
		/** Width of the tile image in pixels */
		imagewidth?: number;
		/** Layer with type objectgroup (optional) */
		objectgroup?: Objectgroup;
		/** A list of properties (name, value, type) */
		properties?: Property[];
		/** index of terrain for each corner of tile */
		terrain?: [number, number, number, number];
		/** The type of the tile (optional) */
		type?: string;
	}
	interface Frame {
		/** Frame duration in milliseconds */
		duration: number;
		/** Local tile ID representing this frame */
		tileid: number;
	}

	interface Terrain {
		/** Name of terrain */
		name: string;
		/** Local ID of tile representing terrain */
		tile: number;
		// no documentation
		/** A list of properties (name, value, type). */
		properties?: Property[];
	}

	interface WangSet {
		/** Array of Wang colors */
		cornercolors: WangColor[];
		/** Array of Wang colors */
		edgecolors: WangColor[];
		/** Name of the Wang set */
		name: string;
		/** Local ID of tile representing the Wang set */
		tile: number;
		/** Array of Wang tiles */
		wangtiles: WangTiles[];
		// no documentation
		/** A list of properties (name, value, type). */
		properties?: Property[];
	}

	//TODO custome properties not in JSON, bug?
	interface WangColor {
		/** Hex-formatted color (#RRGGBB or #AARRGGBB) */
		color: string;
		/** Name of the Wang color */
		name: string;
		/** Probability used when randomizing */
		probability: number;
		/** Local ID of tile representing the Wang color */
		tile: number;
	}

	interface WangTiles {
		/** Tile is flipped diagonally */
		dflip: boolean;
		/** Tile is flipped horizontally */
		hflip: boolean;
		/** Local ID of tile */
		tileid: number;
		/** Tile is flipped vertically */
		vflip: boolean;
		/** Array of Wang color indexes (uchar[8]) */
		wangid: [number, 0, number, 0, number, 0, number, 0];
	}
}
