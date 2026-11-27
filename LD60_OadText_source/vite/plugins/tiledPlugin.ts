// TODO file self references do not work

import fs from 'node:fs/promises';

import { createFilter, createLogger, type FilterPattern, type Plugin } from 'vite';
import { excludeVirtualModules } from '../utils/filter';

import { parseStringPromise } from 'xml2js';

const name = 'tiled-plugin';

type Transformers = {
	properties?(value: any, context: { typing: any }): any;
};

export default function tiledPlugin(options: {
	include?: FilterPattern;
	exclude?: FilterPattern;
	transformers?: Transformers;
}) {
	const filter = createFilter(
		options.include ?? '**/*.tmx',
		options.exclude,
	);

	let logger;

	return {
		name,
		configResolved(config) {
			logger = createLogger(config.logLevel, {
				prefix: `[${name}]`,
			});
		},
		load: {
			filter: {
				id: excludeVirtualModules({
					include: options.include ?? '**/*.tmx',
					exclude: options.exclude,
				}),
			},
			async handler(id) {
				logger.warnOnce(`${name} is not implementended`, {
					timestamp: true,
				});

				const tmx = await fs.readFile(id, 'utf8');

				const json = await tmx2js(tmx, {
					fileTransform: a => new File(a),
					transformers: options.transformers,
				});
				const modules: { path: string; name: string }[] = [];
				const content = stringify(json, modules);

				return `${
					modules
						.map(({ name, path }) => `import ${name} from "${path}";`)
						.join('\n')
				}

export default ${content}`;
			},
		},
		typing: {
			async load(id) {
				if (!filter(id)) {
					return null;
				}

				const tmx = await fs.readFile(id, 'utf8');

				const json = await tmx2js(tmx, {
					fileTransform: a => new File(a),
					transformers: options.transformers,
					typing: true,
				});
				const modules: { path: string; name: string }[] = [];
				const content = stringifyTyping(json, modules);

				return {
					kind: 'TS_TYPE',
					imports: modules.map(({ name, path }) =>
						`import i${name} from "${path}"; type ${name} = typeof i${name};`
					),
					type: content,
				};
			},
		},
	} satisfies Plugin;
}

class File {
	public path: string;
	constructor(path: string) {
		this.path = path;
	}
}

function stringify(data: any, modules: { path: string; name: string }[]) {
	if (typeof data === 'object') {
		if (data instanceof File) {
			modules.push({
				path: `./${data.path}`,
				name: `r${modules.length}`,
			});
			return `r${modules.length - 1}`;
		} else if (data instanceof Array) {
			let str = '[';
			for (const value of data) {
				str += `${stringify(value, modules)}, `;
			}
			str += ']';
			return str;
		} else {
			let str = '{\n';
			for (const [key, value] of Object.entries(data)) {
				str += `${key}: ${stringify(value, modules)},\n`;
			}
			str += '}';
			return str;
		}
	} else if (typeof data === 'string') {
		return `"${data.replace('"', '\\"')}"`;
	} else {
		return data;
	}
}

function removeDuplicates(values: string[]): string[] {
	return [...new Set(values)];
}

abstract class Field {
	public abstract isDiscriminator: boolean;
	abstract renderType(modules: { path: string; name: string }[]): string;
	abstract merge(fields: this[]): Field[];

	static merge(fields: Field[]): UnionField {
		return new UnionField(Object
			.values(Object.groupBy(fields, (field) => Object.getPrototypeOf(field).constructor.name))
			.flatMap(group => group![0].merge(group!)));
	}
}

class LiteralField extends Field {
	constructor(private value: unknown, public isDiscriminator = false) {
		super();
	}
	renderType(modules): string {
		if (this.value instanceof File) {
			const path = `./${this.value.path}`;
			const module = modules.find(m => m.path === path);
			if (module) {
				return module.name;
			}
			modules.push({
				path,
				name: `r${modules.length}`,
			});
			return `r${modules.length - 1}`;
		}
		if (typeof this.value === 'string') {
			return `"${this.value.replace('"', '\\"')}"`;
		}
		return `${this.value as any}`;
	}
	merge(fields: this[]) {
		return fields;
	}
}

class UnionField extends Field {
	private values: Field[];
	public isDiscriminator = false;
	constructor(values: unknown[]) {
		super();
		this.values = values.map(toField);
	}
	renderType(modules): string {
		return removeDuplicates(this.values.map(v => v.renderType(modules))).join(' | ');
	}
	merge(): Field[] {
		throw new Error('Method not implemented.');
	}
	removeUndefined(): UnionField {
		const hasUndefined = this.values.some(v => v.renderType([]) === 'undefined');
		if (!hasUndefined) {
			return this;
		}
		return new UnionField(this.values.filter(v => v.renderType([]) !== 'undefined'));
	}
}

class ArrayField extends Field {
	private values: Field[];
	public isDiscriminator = false;
	constructor(values: unknown[], public ignoreOrder = false) {
		super();
		this.values = values.map(toField);
	}
	renderType(modules): string {
		if (!this.ignoreOrder) {
			return `[${this.values.map(v => v.renderType(modules)).join(', ')}]`;
		}
		return `(${Field.merge(this.values).renderType(modules)})[]`;
	}
	merge(fields: this[]): Field[] {
		return fields;
	}
}

class ObjectField extends Field {
	private value: Record<any, Field | undefined>;
	public isDiscriminator = false;
	constructor(value: object) {
		super();
		this.value = Object.fromEntries(Object.entries(value)
			.map(([key, value]) => [key, toField(value)]));
	}
	renderType(modules): string {
		let str = '{\n';
		for (const [key, value] of Object.entries(this.value)) {
			if (value instanceof UnionField) {
				const clearedValue = value.removeUndefined();
				if (clearedValue !== value) {
					str += `${key}?: ${clearedValue.renderType(modules)},\n`;
					continue;
				}
			}
			str += `${key}: ${value!.renderType(modules)},\n`;
		}
		str += '}';
		return str;
	}
	merge(objects: this[]): Field[] {
		const discriminatorKeys = removeDuplicates(objects
			.flatMap(f => Object.entries(f.value).filter(([_, value]) => value?.isDiscriminator).map(([key]) => key)));

		const groups = Object.values(Object.groupBy(objects, (object) => {
			return JSON.stringify(Object
				.fromEntries(discriminatorKeys.map(e => {
					const field = object.value[e];
					const isDiscriminator = field?.isDiscriminator ?? false;
					return [e, isDiscriminator ? field!.renderType([]) : undefined];
				})));
		}));

		return groups.map((group) => {
			const allFields = removeDuplicates(group!.flatMap(f => Object.keys(f.value)));
			return new ObjectField(Object.fromEntries(allFields
				.map(f => [f, Field.merge(group!.map(he => he.value[f] ?? new LiteralField(undefined)))])));
		});
	}
}

function toField(data: unknown) {
	if (data instanceof Field) {
		return data;
	}
	if (typeof data !== 'object' || data instanceof File || data == null) {
		return new LiteralField(data);
	}
	if (data instanceof Array) {
		return new ArrayField(data);
	}
	return new ObjectField(data);
}

function stringifyTyping(data: any, modules: { path: string; name: string }[]) {
	return toField(data).renderType(modules);
}

export async function tmx2js(tmx: string, { fileTransform, transformers, typing }: {
	fileTransform;
	transformers?: Transformers | undefined;
	typing?: boolean;
}) {
	// TODO

	// TODO use discriminator and set in more places
	const type = {
		discriminator,
		set,
	};

	function discriminator(value: unknown) {
		if (!typing) return value;
		return new LiteralField(value, true);
	}

	function set(value: unknown[]) {
		if (!typing) return value;
		return new ArrayField(value, true);
	}

	const xml = await parseStringPromise(tmx, {
		preserveChildrenOrder: true,
		explicitChildren: true,
	});

	function noSupport(node, parent) {
		//			gutil.log(gutil.colors.bgRed('tmx2json') + ' ’' + gutil.colors.cyan(node['#name'] + "element") + "’ in ’" + gutil.colors.cyan(parent['#name'] + "element") + "’ is not supported");
	}

	function parseMap(node) {
		const map = {} as any;

		map.type = 'map';
		map.version = parseFloat(node.$.version);
		map.tiledversion = node.$.tiledversion;
		map.orientation = node.$.orientation;
		map.renderorder = node.$.renderorder;
		map.width = parseInt(node.$.width);
		map.height = parseInt(node.$.height);
		map.tilewidth = parseInt(node.$.tilewidth);
		map.tileheight = parseInt(node.$.tileheight);
		if (node.$.skewx) map.skewx = parseInt(node.$.skewx);
		if (node.$.skewy) map.skewy = parseInt(node.$.skewy);
		map.infinite = node.$.infinite === '1';
		map.nextlayerid = parseInt(node.$.nextlayerid);
		map.nextobjectid = parseInt(node.$.nextobjectid);

		map.properties = {} as any;
		map.tilesets = [];
		map.layers = [];

		if (node.$$ !== undefined) {
			for (let i = 0; i < node.$$.length; i++) {
				const child = node.$$[i];

				if (child['#name'] === 'properties') {
					map.properties = parseProperties(child);
				} else if (child['#name'] === 'tileset') {
					map.tilesets.push(parseTileset(child));
				} else if (child['#name'] === 'layer') {
					map.layers.push(parseLayer(child));
				} else if (child['#name'] === 'objectgroup') {
					map.layers.push(parseObjectgroup(child, map));
				} else if (child['#name'] === 'imagelayer') {
					map.layers.push(parseImagelayer(child, map));
				} else if (child['#name'] === 'group') {
					map.layers.push(parseGrouplayer(child));
				} else if (child['#name'] !== undefined) {
					noSupport(child, node);
				}
			}
		}

		return map;
	}

	function parseProperties(node) {
		const properties = [] as any[];
		for (let i = 0; i < node.$$.length; i++) {
			const property = node.$$[i];
			const type = property.$.type || 'string';
			let value = property.$.value;
			if (type === 'bool') {
				value = value === 'true';
			} else if (type === 'float' || type === 'int' || type === 'object') {
				value = parseFloat(value);
			} else if (type === 'file') {
				value = fileTransform(value);
			} else if (type === 'list') {
				value = parseProperties(property);
			}
			properties.push({
				// name is null when the property is an item of a list
				...property.$.name && { name: property.$.name },
				type,
				value,
			});
		}
		return transformers?.properties?.(properties, { typing: type }) ?? set(properties);
	}

	function parseLayer(node) {
		const layer = {} as any;
		layer.id = parseInt(node.$.id);
		if (node.$.mode) layer.mode = node.$.mode;
		layer.name = node.$.name;
		layer.type = 'tilelayer';
		layer.x = 0;
		layer.y = 0;
		layer.width = parseInt(node.$.width);
		layer.height = parseInt(node.$.height);
		layer.opacity = parseFloat(node.$.opacity) || 1; //kann nur auf 0.01, trotzdem wie unten?
		layer.visible = node.$.visible === '0' ? false : true;

		if (node.$$ !== undefined) { //ist eig immer was
			for (let i = 0; i < node.$$.length; i++) {
				const child = node.$$[i];

				if (child['#name'] === 'properties') {
					layer.properties = parseProperties(child);
				} else if (child['#name'] === 'data') {
					layer.data = parseData(child);
				} else if (child['#name'] !== undefined) {
					noSupport(child, node);
				}
			}
		}

		return layer;
	}

	function parseData(node) {
		// noch nicht komplett tileflipping?// TODO

		let data;
		const encoding = (node.$ && node.$.encoding) || 'xml';
		const compression = (node.$ && node.$.compression) || '';

		if (encoding === 'xml') {
			data = [];
			for (let i = 0; i < node.$$.length; i++) {
				data.push(node.$$[i].$ ? parseInt(node.$$[i].$.gid) : 0);
			}
		} else if (encoding === 'csv') {
			const csv = node._.replace(/[\n\r]/g, '');
			data = csv.split(',').map(function(e) {
				return parseInt(e);
			});
		} else if (encoding === 'base64') {
			data = [];
			const buffer = Buffer.from(node._, 'base64');

			/*if (compression === 'gzip') {
				buffer = zlib.gunzipSync(buffer);
			} else if (compression === 'zlib') {
				buffer = zlib.inflateSync(buffer);
			} else */ if (compression !== '') {
				console.log(compression + ' is not supported');
			}

			for (let i = 0; i < buffer.length / 4; i++) {
				data.push(buffer.readUInt32LE(i * 4));
			}
		} else {
			console.log(encoding + ' is not supported');
		}

		return data;
	}

	function parseTileset(node) {
		const tileset = {} as any;

		tileset.firstgid = parseInt(node.$.firstgid);
		// source is not supported
		// TODO
		tileset.name = node.$.name;
		tileset.tilewidth = parseInt(node.$.tilewidth);
		tileset.tileheight = parseInt(node.$.tileheight);
		tileset.tilecount = parseInt(node.$.tilecount);
		tileset.columns = parseInt(node.$.columns);
		tileset.spacing = parseInt(node.$.spacing) || 0;
		tileset.margin = parseInt(node.$.margin) || 0;

		tileset.tiles = [];

		if (node.$$ !== undefined) {
			for (let i = 0; i < node.$$.length; i++) {
				const child = node.$$[i];

				if (child['#name'] === 'tileoffset') {
					tileset.tileoffset = {} as any;
					tileset.tileoffset.x = parseInt(child.$.x);
					tileset.tileoffset.y = parseInt(child.$.y);
				} else if (child['#name'] === 'properties') {
					tileset.properties = parseProperties(child);
				} else if (child['#name'] === 'image') {
					tileset.image = fileTransform(child.$.source);
					tileset.imagewidth = parseInt(child.$.width);
					tileset.imageheight = parseInt(child.$.height);
				} else if (child['#name'] === 'terraintypes') {
					tileset.terrains = parseTerraintypes(child);
				} else if (child['#name'] === 'tile') {
					tileset.tiles.push(parseTile(child, node));
				} else if (child['#name'] === 'grid') {
					tileset.grid = {} as any;
					tileset.grid.orientation = child.$.orientation;
					tileset.grid.width = parseInt(child.$.width);
					tileset.grid.height = parseInt(child.$.height);
				} else if (child['#name'] === 'wangsets') {
					tileset.wangsets = parseWangsets(child);
				} else if (child['#name'] !== undefined) {
					noSupport(child, node);
				}
			}
		}

		if (Object.keys(tileset.tiles).length === 0) {
			delete tileset.tiles;
		}

		return tileset;
	}

	function parseGrouplayer(node) {
		const group = {} as any;
		group.id = parseInt(node.$.id);
		if (node.$.mode) group.mode = node.$.mode;
		group.name = node.$.name;
		if (node.$.offsetx) group.offsetx = parseInt(node.$.offsetx);
		if (node.$.offsety) group.offsety = parseInt(node.$.offsety);
		group.type = 'group';
		group.x = 0;
		group.y = 0;
		group.opacity = parseFloat(node.$.opacity) || 1;
		group.visible = node.$.visible === '0' ? false : true;
		group.layers = [];

		if (node.$$ !== undefined) {
			for (let i = 0; i < node.$$.length; i++) {
				const child = node.$$[i];

				if (child['#name'] === 'properties') {
					group.properties = parseProperties(child);
				} else if (child['#name'] === 'layer') {
					group.layers.push(parseLayer(child));
				} else if (child['#name'] === 'objectgroup') {
					group.layers.push(parseObjectgroup(child, group));
				} else if (child['#name'] === 'imagelayer') {
					group.layers.push(parseImagelayer(child, group));
				} else if (child['#name'] === 'group') {
					group.layers.push(parseGrouplayer(child));
				} else if (child['#name'] !== undefined) {
					noSupport(child, node);
				}
			}
		}

		return group;
	}

	function parseTerraintypes(node) {
		const terrains = [] as any[];

		if (node.$$ !== undefined) { //ist eig immer was
			for (let i = 0; i < node.$$.length; i++) {
				const child = node.$$[i];
				const terrain = {} as any;
				terrain.name = child.$.name;
				terrain.tile = parseInt(child.$.tile);

				terrains.push(terrain);

				if (child.$$ !== undefined) {
					terrain.properties = parseProperties(child.$$[0]);
				}
			}
		}

		return terrains;
	}

	function parseTile(node, _parent) {
		const tile = {} as any;

		tile.id = parseInt(node.$.id);

		const probability = node.$.probability;
		const terrain = node.$.terrain;

		if ((probability !== undefined || terrain !== undefined)) {
			if (probability !== undefined) tile.probability = probability; //TODO no documentation

			if (terrain !== undefined) {
				const values = terrain.split(',');
				tile.terrain = [];
				for (let corner = 0; corner < 4; corner++) {
					tile.terrain.push(values[corner] === '' ? -1 : parseInt(values[corner]));
				}
			}
		}

		if (node.$$ !== undefined) {
			for (let i = 0; i < node.$$.length; i++) {
				const child = node.$$[i];

				if (child['#name'] === 'properties') {
					tile.properties = parseProperties(child);
				} else if (child['#name'] === 'image') {
					tile.image = fileTransform(child.$.source);
					// width and height are undefined if the path is invalid
					if (child.$.width) tile.imagewidth = parseInt(child.$.width);
					if (child.$.height) tile.imageheight = parseInt(child.$.height);
				} else if (child['#name'] === 'objectgroup') {
					tile.objectgroup = parseObjectgroup(child, { width: 0, height: 0 });
				} else if (child['#name'] === 'animation') {
					tile.animation = parseAnimation(child);
					noSupport(child, node);
				} else if (child['#name'] !== undefined) {
					noSupport(child, node);
				}
			}
		}

		return tile;
	}

	function parseWangsets(node) {
		const wangsets = [] as any[];

		for (let i = 0; i < node.$$.length; i++) {
			const child = node.$$[i];

			const wangset = {} as any;

			wangset.name = child.$.name;
			wangset.tile = parseInt(child.$.tile);
			wangset.cornercolors = [];
			wangset.edgecolors = [];
			wangset.wangtiles = [];

			for (let j = 0; child.$$ && j < child.$$.length; j++) {
				const grandson = child.$$[j];

				if (grandson['#name'] === 'wangcornercolor') {
					wangset.cornercolors.push({
						name: grandson.$.name,
						color: grandson.$.color,
						tile: parseInt(grandson.$.tile),
						probability: parseFloat(grandson.$.probability),
					});
				} else if (grandson['#name'] === 'wangedgecolor') {
					wangset.edgecolors.push({
						name: grandson.$.name,
						color: grandson.$.color,
						tile: parseInt(grandson.$.tile),
						probability: parseFloat(grandson.$.probability),
					});
				} else if (grandson['#name'] === 'wangtile') {
					wangset.wangtiles.push({
						tileid: parseInt(grandson.$.tileid),
						wangid: grandson.$.wangid.slice(2).padStart(8, '0').split('').map(Number).reverse(),
					});
				} else if (grandson['#name'] === 'properties') {
					wangset.properties = parseProperties(grandson);
				} else if (grandson['#name'] !== undefined) {
					noSupport(grandson, child);
				}
			}

			wangsets.push(wangset);
		}

		return wangsets;
	}

	function parseAnimation(node) {
		const animation = [] as any[];

		if (node.$$ !== undefined) { //ist eig immer was
			for (let i = 0; i < node.$$.length; i++) {
				const child = node.$$[i];

				if (child['#name'] === 'frame') {
					animation.push(parseFrame(child));
				} else if (child['#name'] !== undefined) {
					noSupport(child, node);
				}
			}
		}

		return animation;
	}

	function parseFrame(node) {
		const frame = {} as any;

		frame.duration = parseInt(node.$.duration);
		frame.tileid = parseInt(node.$.tileid);

		return frame;
	}

	function parseObjectgroup(node, _parent) {
		const group = {} as any;

		if (node.$.id) group.id = parseInt(node.$.id);
		if (node.$.mode) group.mode = node.$.mode;
		group.name = node.$.name || '';
		if (node.$.offsetx) group.offsetx = parseInt(node.$.offsetx);
		if (node.$.offsety) group.offsety = parseInt(node.$.offsety);
		group.type = 'objectgroup';
		if (node.$.color) group.color = node.$.color;
		group.x = 0;
		group.y = 0;
		group.opacity = node.$.opacity === undefined ? 1 : parseFloat(node.$.opacity);
		group.visible = node.$.visible === '0' ? false : true;
		group.draworder = node.$.draworder === 'index' ? 'index' : 'topdown';

		const objects = [] as any;

		if (node.$$ !== undefined) {
			for (let i = 0; i < node.$$.length; i++) {
				const child = node.$$[i];

				if (child['#name'] === 'properties') {
					group.properties = parseProperties(child);
				} else if (child['#name'] === 'object') {
					objects.push(parseObject(child));
				} else if (child['#name'] !== undefined) {
					noSupport(child, node);
				}
			}
		}

		group.objects = set(objects);

		return group;
	}

	function parseObject(node) {
		const object = {} as any;

		if (parseInt(node.$.id)) object.id = parseInt(node.$.id); //TODO auch bei anderen so checken?
		object.name = node.$.name || '';
		object.opacity = node.$.opacity === undefined ? 1 : parseFloat(node.$.opacity);
		object.type = discriminator(node.$.type || '');
		object.x = parseFloat(node.$.x);
		object.y = parseFloat(node.$.y);
		object.width = parseFloat(node.$.width) || 0;
		object.height = parseFloat(node.$.height) || 0;
		if (node.$.gid !== undefined) object.gid = parseInt(node.$.gid);
		object.rotation = parseFloat(node.$.rotation) || 0;
		object.visible = node.$.visible === '0' ? false : true;

		if (node.$$ !== undefined) {
			for (let i = 0; i < node.$$.length; i++) {
				const child = node.$$[i];

				if (child['#name'] === 'properties') {
					object.properties = parseProperties(child);
				} else if (child['#name'] === 'ellipse') {
					object.ellipse = true;
				} else if (child['#name'] === 'capsule') {
					object.capsule = true;
				} else if (child['#name'] === 'point') {
					object.point = true;
				} else if (child['#name'] === 'polygon' || child['#name'] === 'polyline') {
					const poly = [] as any[];
					const points = child.$.points.split(' ');
					for (let l = 0; l < points.length; l++) {
						const point = {} as any;
						const coords = points[l].split(',');
						point.x = parseFloat(coords[0]);
						point.y = parseFloat(coords[1]);
						poly.push(point);
					}
					object[child['#name']] = poly;
				} else if (child['#name'] === 'text') {
					object.text = {} as any;
					object.text.text = child._ || '';
					if (child.$.fontfamily) object.text.fontfamily = child.$.fontfamily;
					if (child.$.pixelsize) object.text.pixelsize = parseInt(child.$.pixelsize);
					if (child.$.wrap) object.text.wrap = child.$.wrap === '1';
					if (child.$.color) object.text.color = child.$.color;
					if (child.$.bold) object.text.bold = child.$.bold === '1';
					if (child.$.italic) object.text.italic = child.$.italic === '1';
					if (child.$.underline) object.text.underline = child.$.underline === '1';
					if (child.$.strikeout) object.text.strikeout = child.$.strikeout === '1';
					if (child.$.kerning) object.text.kerning = child.$.kerning === '1';
					if (child.$.halign) object.text.halign = child.$.halign;
					if (child.$.valign) object.text.valign = child.$.valign;
				} else if (child['#name'] !== undefined) {
					noSupport(child, node);
				}
			}
		}
		return object;
	}

	function parseImagelayer(node, _parent) {
		const imagelayer = {} as any;

		if (node.$.id) imagelayer.id = parseInt(node.$.id);
		if (node.$.mode) imagelayer.mode = node.$.mode;
		imagelayer.name = node.$.name;
		if (node.$.offsetx) imagelayer.offsetx = parseInt(node.$.offsetx);
		if (node.$.offsety) imagelayer.offsety = parseInt(node.$.offsety);
		imagelayer.type = 'imagelayer';
		imagelayer.x = parseInt(node.$.x) || 0;
		imagelayer.y = parseInt(node.$.y) || 0;
		imagelayer.opacity = node.$.opacity === undefined ? 1 : parseFloat(node.$.opacity);
		imagelayer.visible = node.$.visible === '0' ? false : true;
		imagelayer.image = '';

		if (node.$$ !== undefined) {
			for (let i = 0; i < node.$$.length; i++) {
				const child = node.$$[i];

				if (child['#name'] === 'properties') {
					imagelayer.properties = parseProperties(child);
				} else if (child['#name'] === 'image') {
					imagelayer.image = fileTransform(child.$.source);
					imagelayer.transparentcolor = '#' + child.$.trans;
				} else if (child['#name'] !== undefined) {
					noSupport(child, node);
				}
			}
		}

		return imagelayer;
	}

	return parseMap(xml.map);
}
