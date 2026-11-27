import { type ReactElement, useCallback, useEffect, useRef } from 'react';

// TODO handle multiple pointers

export default function Hoverable<T extends ReactElement>({
	children,
}: {
	children: (hover: boolean, active: boolean) => T;
}) {
	const { current: state } = useRef({
		hover: false,
		active: false,
	});

	useEffect(() => {
		const pointerUp = () => {
			state.active = false;
		};
		window.addEventListener('pointerup', pointerUp);
		return () => {
			pointerUp();
			window.removeEventListener('pointerup', pointerUp);
		};
	}, []);

	const pointerDown = useCallback(() => state.active = true, []);
	const pointerOver = useCallback(() => state.hover = true, []);
	const pointerOut = useCallback(() => state.hover = false, []);

	return (
		<pixiContainer
			eventMode="dynamic"
			onPointerDown={pointerDown}
			onPointerOver={pointerOver}
			onPointerOut={pointerOut}
		>
			{children(state.hover, state.active)}
		</pixiContainer>
	);
}
