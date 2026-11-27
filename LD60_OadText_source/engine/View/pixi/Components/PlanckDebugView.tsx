import { type Chain, type Circle, type Edge, type Polygon, Vec2, type Body, type World } from 'planck';
import { useRef, useEffect, useCallback } from 'react';
import { type EventMode, type FederatedPointerEvent, type Graphics as PixiGraphics } from 'pixi.js';
import * as planck from 'planck';

const DEFAULT_RATIO = 16;

type Props = {
	world: World;
	x?: number;
	y?: number;
	/**
	 * Ratio of pixel per meter
	 */
	ratio?: number;
	lineWidth?: number;

	scaleY?: 1 | -1;

	eventMode?: EventMode;
	mouseForce?: number;
};

function isInteractive(eventMode: EventMode = 'auto') {
	return ['static', 'dynamic'].includes(eventMode);
}

export default function PlanckDebugView(props: Props) {
	const mouseJoint = useRef<planck.MouseJoint>(null);
	const mouseGround = useRef<Body>(null);
	const targetBody = useRef<Body>(null);
	const lastMousePosition = useRef(new Vec2(0, 0));

	useEffect(() => {
		mouseGround.current = props.world.createBody();
		return () => {
			props.world.destroyBody(mouseGround.current!);
		};
	}, [props.world]);

	const findBody = useCallback((point: Vec2) => {
		let body: Body | null = null;
		const aabb = new planck.AABB(point, point);
		props.world.queryAABB(aabb, (fixture) => {
			if (!fixture.getBody().isDynamic() || !fixture.testPoint(point)) {
				return true;
			}
			body = fixture.getBody();
			return false;
		});
		return body;
	}, [props.world]);

	const setPointer = useCallback((e: FederatedPointerEvent) => {
		const target = e.currentTarget as PixiGraphics;
		if (target == null) return;

		const position = e.getLocalPosition(target);
		const point = new Vec2(position.x, position.y).mul(1 / (props.ratio ?? DEFAULT_RATIO));

		if (targetBody.current) {
			return;
		}

		const body = findBody(point);
		if (!body) {
			return;
		}

		if (props.mouseForce) {
			targetBody.current = body;
			lastMousePosition.current.set(position.x, position.y);
		} else if (mouseGround.current) {
			mouseJoint.current = new planck.MouseJoint({ maxForce: 1000 }, mouseGround.current, body, new Vec2(point));
			props.world.createJoint(mouseJoint.current);
		}
	}, [props.ratio, props.world, props.mouseForce, findBody]);

	const movePointer = useCallback((e: FederatedPointerEvent) => {
		const target = e.currentTarget as PixiGraphics;
		if (target == null) return;

		const position = e.getLocalPosition(target);
		const point = new Vec2(position.x, position.y).mul(1 / (props.ratio ?? DEFAULT_RATIO));

		if (mouseJoint.current) {
			mouseJoint.current.setTarget(point);
		}
		if (targetBody.current) {
			lastMousePosition.current.set(position.x, position.y);
		}
	}, [props.ratio]);

	const releasePointer = useCallback(() => {
		const position = lastMousePosition.current;
		const point = new Vec2(position.x, position.y).mul(1 / (props.ratio ?? DEFAULT_RATIO));

		if (mouseJoint.current) {
			props.world.destroyJoint(mouseJoint.current);
			mouseJoint.current = null;
		}
		if (targetBody.current) {
			const force = Vec2.sub(point, targetBody.current.getPosition());
			targetBody.current.applyForceToCenter(force.mul(props.mouseForce ?? 0), true);
			targetBody.current = null;
		}
	}, [props.ratio, props.world, props.mouseForce]);

	const cancelPointer = useCallback(() => {
		if (mouseJoint.current) {
			props.world.destroyJoint(mouseJoint.current);
			mouseJoint.current = null;
		}
		if (targetBody.current) {
			targetBody.current = null;
		}
	}, [props.world]);

	const interactive = isInteractive(props.eventMode);

	useEffect(() => {
		if (interactive) {
			window.addEventListener('mouseup', releasePointer);
			window.addEventListener('blur', cancelPointer);
			return () => {
				window.removeEventListener('mouseup', releasePointer);
				window.removeEventListener('blur', cancelPointer);
			};
		}
	}, [interactive, releasePointer, cancelPointer]);

	// use separate effect to avoid calling cancelPointer too often
	useEffect(() => {
		if (interactive) {
			return cancelPointer;
		}
	}, [interactive, cancelPointer, !props.mouseForce]);

	return (
		<pixiGraphics
			draw={(g) => draw(g, props, lastMousePosition.current, targetBody.current)}
			x={props.x ?? 0}
			y={props.y ?? 0}
			scale={{ x: 1, y: props.scaleY ?? 1 }}
			eventMode={props.eventMode}
			onMouseDown={setPointer}
			onGlobalMouseMove={movePointer}
		/>
	);
}

function draw(graphics: PixiGraphics, props: Props, lastMousePosition: Vec2, targetBody: Body | null) {
	const ratio = props.ratio ?? DEFAULT_RATIO;
	const lineWidth = props.lineWidth ?? 2;

	if (!graphics) {
		return;
	}
	graphics.clear();

	if (targetBody) {
		const a = lastMousePosition;
		const b = Vec2.mul(ratio, targetBody.getPosition());

		graphics.moveTo(a.x, a.y);
		graphics.lineTo(b.x, b.y);
		graphics.stroke({
			width: lineWidth,
			color: 0xffffff,
			alpha: 0.2,
		});
	}

	for (let body = props.world.getBodyList(); body; body = body.getNext()) {
		for (let fixture = body.getFixtureList(); fixture; fixture = fixture.getNext()) {
			const type = fixture.getType();
			const shape = fixture.getShape();

			if (type === 'circle') {
				drawCircle(graphics, body, shape as Circle, ratio);
			}
			if (type === 'edge') {
				drawEdge(graphics, body, shape as Edge, ratio);
			}
			if (type === 'polygon') {
				drawPolygon(graphics, body, shape as Polygon, ratio);
			}
			if (type === 'chain') {
				drawChain(graphics, body, shape as Chain, ratio);
			}

			graphics.stroke({
				width: lineWidth,
				color: 0xffffff,
				alpha: body.isDynamic()
					? 0.9
					: body.isKinematic()
					? 0.7
					// static
					: 0.5,
			});

			graphics.fill({
				color: 0xffffff,
				alpha: 0.2,
			});
		}
	}

	for (let j = props.world.getJointList(); j; j = j.getNext()) {
		drawJoint(graphics, j, ratio);
		graphics.stroke({
			width: lineWidth,
			color: 0xffffff,
			alpha: 0.2,
		});
	}
}

function drawJoint(graphics: PixiGraphics, joint: planck.Joint, ratio: number) {
	const a = Vec2.mul(ratio, joint.getAnchorA());
	const b = Vec2.mul(ratio, joint.getAnchorB());

	graphics.moveTo(a.x, a.y);
	graphics.lineTo(b.x, b.y);
}

function drawCircle(graphics: PixiGraphics, body: Body, shape: Circle, ratio: number) {
	const pos = Vec2.mul(ratio, body.getPosition());
	graphics.circle(pos.x + shape.m_p.x, pos.y + shape.m_p.y, ratio * shape.m_radius);
}

function drawEdge(graphics: PixiGraphics, body: Body, shape: Edge, ratio: number) {
	const pos = Vec2.mul(ratio, body.getPosition()), r = body.getAngle();

	const v1 = Vec2.mul(ratio, shape.m_vertex1);
	const v2 = Vec2.mul(ratio, shape.m_vertex2);

	graphics.moveTo(v1.x * Math.cos(r) - v1.y * Math.sin(r) + pos.x, v1.y * Math.cos(r) + v1.x * Math.sin(r) + pos.y);
	graphics.lineTo(v2.x * Math.cos(r) - v2.y * Math.sin(r) + pos.x, v2.y * Math.cos(r) + v2.x * Math.sin(r) + pos.y);
}

function drawPolygon(graphics: PixiGraphics, body: Body, shape: Polygon, ratio: number) {
	const pos = Vec2.mul(ratio, body.getPosition()), r = body.getAngle();

	const vertices = shape.m_vertices;

	if (!vertices.length) {
		return;
	}

	const last = Vec2.mul(ratio, vertices[vertices.length - 1]);

	graphics.moveTo(
		last.x * Math.cos(r) - last.y * Math.sin(r) + pos.x,
		last.y * Math.cos(r) + last.x * Math.sin(r) + pos.y,
	);

	for (let i = 0; i < vertices.length; ++i) {
		const v = Vec2.mul(ratio, vertices[i]);

		const x = v.x * Math.cos(r) - v.y * Math.sin(r) + pos.x;
		const y = v.y * Math.cos(r) + v.x * Math.sin(r) + pos.y;
		// For fun:
		// var x = v.x * Math.cos(r) + v.y * Math.sin(r) + pos.x;
		graphics.lineTo(x, y);
	}
	graphics.closePath();
}

function drawChain(graphics: PixiGraphics, body: Body, shape: Chain, ratio: number) {
	const pos = Vec2.mul(ratio, body.getPosition()), r = body.getAngle();

	const vertices = shape.m_vertices;

	if (!vertices.length) {
		return;
	}

	for (let i = 0; i < vertices.length; ++i) {
		const v = Vec2.mul(ratio, vertices[i]);

		const x = v.x * Math.cos(r) + v.y * Math.sin(r) + pos.x;
		const y = v.y * Math.cos(r) + v.x * Math.sin(r) + pos.y;

		if (i === 0) {
			graphics.moveTo(x, y);
		} else {
			graphics.lineTo(x, y);
		}
	}
}
