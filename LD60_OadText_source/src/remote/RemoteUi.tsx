import Use from 'engine/View/pixi/Components/Use';
import { Graphics, Rectangle, Texture } from 'pixi.js';
import { useMemo } from 'react';

export default function RemoteUi(props: {
	onClick(event: string): void;
	buttonColor: number;
	margin: number;
	width: number;
	height: number;
	gap: number;
}) {
	const widthThird = (props.width - 2 * props.margin - 2 * props.gap) / 3;
	const heightThird = widthThird;

	const widthForth = (props.width - 2 * props.margin - 3 * props.gap) / 4;
	const heightForth = widthForth;

	const graphics = useMemo(() => {
		const g = new Graphics();

		g.setStrokeStyle(0);

		for (let x = 0; x < 3; x++) {
			for (let y = 0; y < 4; y++) {
				g.circle(
					props.margin + 0.5 * widthThird + x * (widthThird + props.gap),
					props.margin + 0.5 * heightThird + y * (heightThird + props.gap),
					widthThird / 2,
				);
			}
		}

		g.fill(props.buttonColor);

		g.roundRect(props.margin, props.height - props.margin - heightForth, widthForth, heightForth, props.gap * 2);
		g.fill(0xFF0000);

		g.roundRect(
			props.margin + (widthForth + props.gap) * 1,
			props.height - props.margin - heightForth,
			widthForth,
			heightForth,
			props.gap * 2,
		);
		g.fill(0x00ff00);

		g.roundRect(
			props.margin + (widthForth + props.gap) * 2,
			props.height - props.margin - heightForth,
			widthForth,
			heightForth,
			props.gap * 2,
		);
		g.fill(0xffff00);

		g.roundRect(
			props.margin + (widthForth + props.gap) * 3,
			props.height - props.margin - heightForth,
			widthForth,
			heightForth,
			props.gap * 2,
		);
		g.fill(0x00ffff);

		return g;
	}, [props.gap, props.height, props.width, props.width, props.buttonColor]);

	const hitArea = useMemo(() => new Rectangle(-widthThird / 2, -heightThird / 2, widthThird, heightThird), [
		widthThird,
		heightThird,
	]);

	const labels = useMemo(() => {
		return ['7', '8', '9', '4', '5', '6', '1', '2', '3', 'P-', '0', 'P+'].map((label, i) => {
			const x = i % 3;
			const y = i / 3 | 0;
			return (
				<pixiText
					key={label}
					eventMode="static"
					text={label}
					x={props.margin + 0.5 * widthThird + x * (widthThird + props.gap)}
					y={props.margin + 0.5 * heightThird + y * (heightThird + props.gap)}
					anchor={0.5}
					hitArea={hitArea}
					style={{
						fontSize: 128,
					}}
					onPointerDown={() => props.onClick(label)}
				/>
			);
		});
	}, [hitArea, widthThird, heightThird, props.onClick]);

	const colorLabels = useMemo(() => {
		return ['RED', 'GREEN', 'YELLOW', 'BLUE'].map((label, x) => {
			return (
				<pixiSprite
					key={label}
					eventMode="static"
					// texture={Texture.WHITE}
					x={props.margin + x * (widthForth + props.gap)}
					y={props.height - props.margin - heightForth}
					width={widthForth}
					height={heightForth}
					onPointerDown={() => props.onClick(label)}
				/>
			);
		});
	}, [hitArea, widthForth, heightForth, props.onClick]);

	return (
		<>
			<Use element={graphics} />
			{labels}
			{colorLabels}
		</>
	);
}
