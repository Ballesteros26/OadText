import { type Container as PixiContainer, type Container, type FederatedPointerEvent, type Point } from 'pixi.js';
import { useCallback, useEffect, useLayoutEffect, useRef, type ReactNode } from 'react';

// TODO handle multiple pointers

export interface DragEvent {
	id: any;
	x: number;
	y: number;
}

export default function Draggable({
	children,
	id,
	x = 0,
	y = 0,
	enabled = true,
	getHoldingPosition = () => null,
	dragStart = () => {},
	dragMove = () => {},
	dragEnd = () => {},
	dragCancel = () => {},
}: {
	children: (x: number, y: number, dragging: boolean) => ReactNode;
	id?: any;
	x?: number;
	y?: number;
	enabled?: boolean;
	/**
	 * Called when the component got mounted. If it returns a point the
	 * component will be in dragging state and the point will be used as
	 * the initial position.
	 *
	 * Make sure to only return a point when the pointer is down.
	 */
	getHoldingPosition?: () => { x: number; y: number } | null;
	dragStart?: (e: DragEvent) => void;
	dragMove?: (e: DragEvent) => void;
	dragEnd?: (e: DragEvent) => void;
	dragCancel?: (e: DragEvent) => void;
}) {
	const ref = useRef<PixiContainer>(null);

	const { current: state } = useRef({
		lastPointerPosition: null as Point | null,
		x,
		y,
		dragging: false,
		dragStart,
		dragMove,
		dragEnd,
		dragCancel,
	});

	useLayoutEffect(() => {
		const holdingPosition = getHoldingPosition();
		if (holdingPosition != null) {
			state.x = holdingPosition.x;
			state.y = holdingPosition.y;
			state.dragging = true;
		}
	}, []);

	// using ref has less overhead than using useCallback
	state.dragStart = dragStart;
	state.dragMove = dragMove;
	state.dragEnd = dragEnd;
	state.dragCancel = dragCancel;

	useEffect(() => {
		if (!enabled) {
			return;
		}
		const pointerUp = () => {
			if (state.dragging) {
				state.dragging = false;
				state.lastPointerPosition = null;

				state.dragEnd({
					id,
					x: state.x,
					y: state.y,
				});
			}
		};
		const cancel = () => {
			if (state.dragging) {
				state.dragging = false;
				state.lastPointerPosition = null;

				state.dragCancel({
					id,
					x: state.x,
					y: state.y,
				});
			}
		};
		window.addEventListener('pointerup', pointerUp);
		window.addEventListener('blur', cancel);
		return () => {
			cancel();
			window.removeEventListener('pointerup', pointerUp);
			window.removeEventListener('blur', cancel);
		};
	}, [id, enabled]);

	const pointerDown = useCallback(function(this: Container, e: FederatedPointerEvent) {
		const pos = e.getLocalPosition(this);

		state.x = x;
		state.y = y;
		state.lastPointerPosition = pos;
		state.dragging = true;

		state.dragStart({
			id,
			x: state.x,
			y: state.y,
		});
	}, [id, x, y]);

	const pointerMove = useCallback(function(this: Container, e: FederatedPointerEvent) {
		if (state.dragging) {
			const pos = e.getLocalPosition(this);

			if (state.lastPointerPosition) {
				state.x += pos.x - state.lastPointerPosition.x;
				state.y += pos.y - state.lastPointerPosition.y;
			}
			state.lastPointerPosition = pos;

			state.dragMove({
				id,
				x: state.x,
				y: state.y,
			});
		}
	}, [id]);

	return (
		<pixiContainer
			ref={ref}
			eventMode={enabled ? 'static' : 'auto'}
			onPointerDown={pointerDown}
			onGlobalPointerMove={pointerMove}
		>
			{children(
				state.dragging ? state.x : x,
				state.dragging ? state.y : y,
				state.dragging,
			)}
		</pixiContainer>
	);
}
