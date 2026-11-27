import Game from 'engine/Game/Game';
import Runner from 'engine/Process/Runner';

// @ts-expect-error
Symbol.dispose ??= Symbol('Symbol.dispose');
// @ts-expect-error
Symbol.asyncDispose ??= Symbol('Symbol.asyncDispose');

// give iPhone time for window size
await new Promise(r => setTimeout(r, 1000));

const runner = new Runner({
	stepsPerSecond: 60,
	lockFramesBySteps: false,
	maximumDelta: 1,
});

runner.start(
	Game,
	import('./index').then(e => e.default),
);
