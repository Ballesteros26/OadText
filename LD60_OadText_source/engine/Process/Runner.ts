import Process from './Process';
import { DEBUGGER_MODE, checkDebuggerMode, getStats } from '../devHooks';

if (__DEV__) {
	var stats = getStats();
}

type RunnerOptions = {
	/**
	 * If set to a value greater than 0, `step` will be called this many times
	 * per second. with a fixed delta time of `1 / stepsPerSecond` seconds.
	 * Otherwise, `step` will be scheduled to be called in every animation frame
	 * with a delta time of the actual time elapsed since the last call.
	 * @default 0
	 */
	stepsPerSecond?: number;
	/**
	 * If set to true, `frame` will be called only when `step` was called since
	 * the last `frame` call. This is a useful optimization when the frame logic
	 * is deterministic and does not depend on e.g. the current time.
	 * @default false
	 */
	lockFramesBySteps?: boolean;
	/**
	 * If set to a value greater than 0, `step` will be called with a delta time
	 * of at most `maximumDelta` seconds. This is useful to avoid large delta
	 * times when the tab is inactive.
	 * @default 0
	 */
	maximumDelta?: number;
};

/**
 * Runner is responsible for scheduling the step and frame calls of a given
 * process.
 */
export default class Runner {
	private started = false;
	private process: Process<unknown> | null = null;

	private stepsPerSecond: number;
	private lockFramesBySteps: boolean;
	private maximumDelta: number;

	private animationFrameId = -1;
	private previous = -1;
	private lag = 1000;

	/**
	 * @param options Optional options to configure the runner
	 */
	constructor(options?: RunnerOptions) {
		this.stepsPerSecond = options?.stepsPerSecond ?? 0;
		this.lockFramesBySteps = options?.lockFramesBySteps ?? false;
		this.maximumDelta = options?.maximumDelta ?? 0;
	}

	/**
	 * Starts the runner with the given process.
	 * @param constructor The root process to run
	 * @param args The arguments to pass to the constructor
	 */
	public start<T extends Process<unknown>, U extends any[]>(constructor: { new (...args: U): T }, ...args: U) {
		if (this.started) {
			throw new Error('Runner is already running');
		}
		this.started = true;

		// eslint-disable-next-line quack-engine/no-direct-process-creation
		this.process = new constructor(...args);
		// calls run if implemented
		this.process.getPromise();

		this.previous = -1;
		this.lag = 1000;

		this.animationFrameId = window.requestAnimationFrame(() => this.loop());
	}

	private loop() {
		if (__DEV__) {
			window.requestAnimationFrame(stats.begin);
		}

		const current = Date.now();
		let elapsed = this.previous === -1
			? 0
			: current - this.previous;

		this.previous = current;

		if (this.maximumDelta !== 0 && elapsed >= this.maximumDelta * 1000) {
			elapsed = this.maximumDelta * 1000 | 0;
		}

		let start = -1;

		if (this.stepsPerSecond === 0) {
			if (__DEV__ && DEBUGGER_MODE) {
				elapsed = Math.round(1000 / 60);
			}

			// Call in separate animation frames to behave as in case of fps > 0
			window.requestAnimationFrame(() => {
				if (__DEV__) start = Date.now();
				Process.callStep(this.process!, elapsed / 1000);
			});
			window.requestAnimationFrame(() => {
				if (__DEV__) start = checkDebuggerMode(start);
				Process.callFrame(this.process!);
			});
			this.animationFrameId = window.requestAnimationFrame(() => {
				if (__DEV__) checkDebuggerMode(start);
				this.loop();
			});
		} else {
			this.lag += elapsed * this.stepsPerSecond;

			const wasDebuggerMode = DEBUGGER_MODE;
			if (__DEV__ && DEBUGGER_MODE) {
				this.lag = 1000;
			}

			const callRender = !this.lockFramesBySteps || this.lag > 500;

			while (this.lag > 500) {
				// Call steps in separate animation frames to ensure micro tasks
				// are always executed between steps
				window.requestAnimationFrame(() => {
					if (__DEV__) {
						// skip if previous frame was debugged
						if (wasDebuggerMode !== DEBUGGER_MODE) return;
						start = checkDebuggerMode(start);
					}
					Process.callStep(this.process!, 1 / this.stepsPerSecond);
				});

				this.lag -= 1000;
			}

			if (callRender) {
				window.requestAnimationFrame(() => {
					if (__DEV__) start = checkDebuggerMode(start);
					Process.callFrame(this.process!);
				});
			}

			this.animationFrameId = window.requestAnimationFrame(() => {
				if (__DEV__ && callRender) checkDebuggerMode(start);
				this.loop();
			});
		}
		if (__DEV__) {
			window.requestAnimationFrame(stats.end);
		}
	}

	public destroy() {
		window.cancelAnimationFrame(this.animationFrameId);
	}
}
