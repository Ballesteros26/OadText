import { useMemo, type ReactNode } from 'react';
import { Graphics } from 'pixi.js';
import type { PixiElements } from '@pixi/react';

type ScalePlaneArguments = { x: number; y: number; width: number; height: number };
type ScalePlaneProps = ScalePlaneArguments & { children: React.ReactElement<InsideProps> };

export default function ScalePlane(props: ScalePlaneProps) {
	const child = props.children;

	switch (child.type) {
		case Inside:
			const [containerProps, insideArguments] = calculateInsideArguments(props, child.props);

			const mask = useMemo(() => {
				return new Graphics()
					.rect(containerProps.x, containerProps.y, containerProps.width, containerProps.height)
					.fill(0xFFFFFF);
			}, [containerProps.x, containerProps.y, containerProps.width, containerProps.height]);

			return (
				<pixiContainer
					x={containerProps.x}
					y={containerProps.y}
					// passing width or height as can lead to distorted views
					// when their values change, e.g. due to HMR
					scale={containerProps.scale}
					mask={mask}
				>
					{child.props.children(insideArguments)}
				</pixiContainer>
			);
		default:
			throw new Error('Invalid child in ScalePlane element.');
	}
}

type InsideArguments = { width: number; height: number; scale: number };
type InsideProps = Partial<InsideArguments> & { children: (p: InsideArguments) => ReactNode };

export function Inside(props: InsideProps): ReactNode {
	throw new Error('Inside element is required to be placed inside a ScalePlane element.');
}

function calculateInsideArguments(
	{ x, y, width: outerWidth, height: outerHeight }: ScalePlaneArguments,
	{ width = 0, height = 0, scale = Infinity }: Partial<InsideArguments>,
) {
	let computedScale = Math.min(
		outerWidth / width,
		outerHeight / height,
		scale,
	);
	if (computedScale === Infinity) {
		// all parameters were undefined
		computedScale = 1;
	}
	// override width and height when zero
	width ||= outerWidth / computedScale;
	height ||= outerHeight / computedScale;

	x += (outerWidth - width * computedScale) / 2 | 0;
	y += (outerHeight - height * computedScale) / 2 | 0;
	outerWidth = Math.round(width * computedScale);
	outerHeight = Math.round(height * computedScale);

	return [{
		x,
		y,
		width: outerWidth,
		height: outerHeight,
		scale: computedScale,
	}, {
		width: width | 0,
		height: height | 0,
		scale: computedScale,
	}] satisfies [props: PixiElements['pixiContainer'], arguments: InsideArguments];
}
