import Process from '../Process/Process';
import { registerPausable } from 'engine/devHooks';

import { getProgress } from './screens/loadingProgress';
import LoadingScreen from './screens/LoadingScreen';
import Bluescreen from './screens/Bluescreen';

export default class Game extends Process<void> {
	private stage: Process<unknown> | null = null;
	private promise: Promise<(game: Game) => Promise<Process<unknown>>> | null;

	private hasError = false;

	private onError = (error: ErrorEvent) => {
		this.switchToBluescreen(error.error, false);
	};
	private onUnhandledRejection = (e: PromiseRejectionEvent) => {
		// https://bugzilla.mozilla.org/show_bug.cgi?id=1642147
		e.preventDefault();
		this.switchToBluescreen(e.reason, true);
	};

	constructor(promise: Promise<(game: Game) => Promise<Process<unknown>>>) {
		super();
		this.promise = promise;

		if (__DEV__) {
			// pause/resume on F6 (but still call frame)
			registerPausable(this);
		}

		window.addEventListener('error', this.onError);
		window.addEventListener('unhandledrejection', this.onUnhandledRejection);
	}

	protected async run() {
		try {
			// treat javascript files as one module
			window.dispatchEvent(new Event('moduleRequested'));
			this.promise!.then(() => {
				window.dispatchEvent(new Event('moduleLoaded'));
			});

			await this.createProcess(LoadingScreen, document.body, this.promise!, getProgress).getPromise();

			const createMain = await this.promise!;
			this.promise = null;

			this.stage = await createMain(this);
			const value = await this.stage.getPromise();
			throw new Error(`Main process returned: ${value}`);
		} catch (error) {
			this.switchToBluescreen(error, true);
			await new Promise(() => {});
		}
	}

	public destroy() {
		// after destroy event listeners would create an infinite recursion
		// because the context was cancelled
		window.removeEventListener('error', this.onError);
		window.removeEventListener('unhandledrejection', this.onUnhandledRejection);

		super.destroy();
	}

	private async switchToBluescreen(error, persistent) {
		if (this.hasError) {
			return;
		}
		this.hasError = true;

		if (__DEV__ && !persistent) {
			if (this.stage) {
				this.stage.pause(true);
			}
		} else {
			if (this.stage) {
				this.stage.destroy();
			}
		}
		const domElements = Array.from(document.body.children);
		for (const child of domElements) {
			document.body.removeChild(child);
		}

		await this.createProcess(Bluescreen, document.body, error, persistent).getPromise();

		if (__DEV__) {
			this.hasError = false;
			for (const child of domElements) {
				document.body.appendChild(child);
			}
			if (this.stage) {
				this.stage.resume();
			}
		}
	}
}
