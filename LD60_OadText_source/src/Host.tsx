import Process from 'engine/Process/Process';
import { component } from 'engine/View/Decorators';
import $Key from './Key.ogg';

import ScalePlane, { Inside } from 'engine/View/pixi/Components/ScalePlane';
import Teletext, { CELL_HEIGHT, CELL_WIDTH, HEIGHT, WIDTH } from './Teletext';
import { RemoteEventEmitter } from './remote/RemoteEventEmitter';
import { BulgePinchFilter, CRTFilter, RGBSplitFilter } from 'pixi-filters';
import { useMemo } from 'react';
import { Rectangle, Ticker } from 'pixi.js';

export default class Host extends Process<number> {
	private teletext: Teletext;

	constructor() {
		super();

		const ee = new RemoteEventEmitter();
		this.teletext = this.createProcess(Teletext, ee);
	}

	@component()
	public View({ width, height }: { width: number; height: number }) {
		const margin = 32;
		const boundary = useMemo(() =>
			new Rectangle(
				-margin,
				-margin,
				WIDTH * CELL_WIDTH + 2 * margin,
				HEIGHT * CELL_HEIGHT + 2 * margin,
			), []);

		return (
			<pixiContainer>
				<ScalePlane x={0} y={0} width={width} height={height}>
					<Inside width={boundary.width} height={boundary.height}>
						{({ width, height, scale }) => (
							<this.Scaled
								width={width}
								height={height}
								scale={scale}
								margin={margin}
								boundary={boundary}
							/>
						)}
					</Inside>
				</ScalePlane>
			</pixiContainer>
		);
	}

	@component()
	public Scaled({ width, height, scale, margin, boundary }: {
		width: number;
		height: number;
		scale: number;
		margin: number;
		boundary: Rectangle;
	}) {
		const filters = useMemo(() => [
			new RGBSplitFilter({
				red: {
					x: 1,
					y: 0,
				},
				blue: {
					x: 0,
					y: 0,
				},
				green: {
					x: -1,
					y: 0,
				},
			}),
			new CRTFilter({
				curvature: 4,
				noise: 0.3,
				noiseSize: 2,
			}),
			new BulgePinchFilter({
				radius: WIDTH * CELL_WIDTH / 1.263089005235602 * scale,
				strength: 0.13, // / 1.263089005235602 * scale,
			}),
		], [scale]);

		// filters?.[0]?.time && (filters[0].time = Date.now());
		const crtFilter = filters.find(e => e instanceof CRTFilter);
		if (crtFilter) {
			const f = crtFilter;
			f.seed = Math.random();
			f.time += 0.1;
		}

		return (
			<pixiContainer
				// eventMode="static"
				// onMouseDown={() => $Key.play()}
				x={margin}
				y={margin}
				boundsArea={boundary}
				filters={filters}
			>
				<this.teletext.View width={width} height={height} />
			</pixiContainer>
		);
	}
}
