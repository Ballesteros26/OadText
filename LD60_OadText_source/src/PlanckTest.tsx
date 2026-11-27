import Process from 'engine/Process/Process';
import { component } from 'engine/View/Decorators';
import PlanckDebugView from 'engine/View/pixi/Components/PlanckDebugView';
import * as planck from 'planck';

export default class PlanckTest extends Process<number> /* extends FixedStepProcess<Number>*/ {
	public world: planck.World;

	constructor() {
		super();

		var testbed: any = {};

		var pl = planck, Vec2 = pl.Vec2;
		this.world = new pl.World(new Vec2(0, -10));

		var columnCount = 2;
		var rowCount = 15;

		var bullet;
		var bodies: any[] = [];
		var indices: number[] = [];

		var ground = this.world.createBody();
		ground.createFixture(new pl.Edge(new Vec2(-40.0, 0.0), new Vec2(40.0, 0.0)));
		ground.createFixture(new pl.Edge(new Vec2(20.0, 0.0), new Vec2(20.0, 20.0)));

		var xs = [0.0, -10.0, -5.0, 5.0, 10.0];

		var fd = {
			density: 1.0,
			friction: 0.3,
		};
		var shape = new pl.Box(0.5, 0.5);

		for (var j = 0; j < columnCount; ++j) {
			for (var i = 0; i < rowCount; ++i) {
				var n = j * rowCount + i;
				indices[n] = n;

				var x = 0.0;
				// var x = pl.Math.random(-0.02, 0.02);
				// var x = i % 2 == 0 ? -0.01 : 0.01;

				var body = this.world.createBody({
					type: 'dynamic',
					userData: indices[n],
				});
				body.setPosition(new Vec2(xs[j] + x, 0.55 + 1.1 * i));
				body.createFixture(shape, fd);

				bodies[n] = body;
			}
		}

		let test = this.world.createBody({
			type: 'dynamic',
			position: new planck.Vec2(17, 5),
		});
		test.createFixture(new planck.Circle(), { density: 3 });
		test.createFixture(new planck.Edge(new planck.Vec2(-4, 0), new planck.Vec2(4, 0)), { density: 3 });
		bodies.push(test);
	}

	public step(delta) {
		this.world.step(delta);
	}

	@component()
	public View() {
		return (
			<PlanckDebugView
				eventMode="static"
				world={this.world}
				x={200}
				y={300}
				ratio={13}
				scaleY={-1}
			/>
		);
	}
}
