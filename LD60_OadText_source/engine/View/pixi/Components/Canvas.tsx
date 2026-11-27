import { type DependencyList, useLayoutEffect, useRef } from 'react';
import { type Graphics } from 'pixi.js';
import { hmrIdentifier } from 'engine/Runtime/__hmrIdentifier';
import type { PixiElements } from '@pixi/react';

export default function Canvas(props: Omit<PixiElements['pixiGraphics'], /*'ref' |*/ 'draw'> & {
	draw: (graphics: Graphics) => (() => void) | void;
	deps: DependencyList | undefined;
}) {
	const { draw, deps, ...graphicProps } = props;

	const ref = useRef<Graphics>(null);

	const dependencyList = deps
		? [
			ref.current,
			...deps,
		]
		: undefined;

	if (__DEV__) {
		dependencyList?.push(hmrIdentifier);
	}

	useLayoutEffect(() => {
		const graphics = ref.current;
		if (!graphics) {
			return;
		}
		return draw(graphics) ?? (() => {
			graphics.clear();
		});
	}, dependencyList);

	return (
		<pixiGraphics
			ref={ref}
			draw={() => {}}
			{...graphicProps}
		/>
	);
}
