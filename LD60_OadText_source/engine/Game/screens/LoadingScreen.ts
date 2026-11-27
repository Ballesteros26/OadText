import Process from 'engine/Process/Process';
import Tween from 'engine/Utils/Tween';
import getLogo from './getLogo';

function easeOutBounce(percent: number) {
	if (percent < 1 / 2.5) {
		return (6.25 * Math.pow(percent, 2));
	} else if (percent < 2 / 2.5) {
		return (6.25 * Math.pow(percent - 1.5 / 2.5, 2) + 0.75);
	} else {
		return (6.25 * Math.pow(percent - 2.25 / 2.5, 2) + 0.9375);
	}
}

function easeInBack(percent: number) {
	const s = 2.5;
	percent = 1 - percent;
	return 1 - ((percent - 1) * (percent - 1) * ((s + 1) * (percent - 1) + s) + 1);
}

export default class LoadingScreen extends Process<void> {
	private logo = getLogo();
	private canvas = document.createElement('canvas');
	private ctx = this.canvas.getContext('2d')!;

	constructor(
		private parentElement: HTMLElement,
		private promise: Promise<unknown>,
		private getProgress: () => number,
	) {
		super();
	}

	private animationState = {
		percent: 0,
		logoScale: 0,
		alpha: 0,
	};

	protected async run() {
		this.parentElement.appendChild(this.canvas);
		if (__DEV__) {
			// skip loadingscreen for development
			this.animationState.percent = 1;
			this.animationState.logoScale = 1;
			this.animationState.alpha = 1;

			await this.promise;
		} else {
			// fade in
			this.createProcess(Tween, this.animationState, { logoScale: 1 }, 36 / 60, easeOutBounce);
			await this.createProcess(
				Tween,
				this.animationState,
				{ alpha: 1 },
				36 / 60,
				Tween.EasingFunctions.easeOutQuint,
			).getPromise();

			// loading bar
			const loadingCap = this.createProcess(Tween, this.animationState, { percent: 1 }, 75 / 60);
			await Promise.all([this.promise, loadingCap.getPromise()]);

			// fade out
			this.createProcess(Tween, this.animationState, { logoScale: 0 }, 24 / 60, easeInBack);
			await this.createProcess(
				Tween,
				this.animationState,
				{ alpha: 0 },
				24 / 60,
				Tween.EasingFunctions.easeInQuint,
			).getPromise();
		}
		this.parentElement.removeChild(this.canvas);
	}

	frame() {
		// Initiate Canvas
		this.canvas.width = window.innerWidth;
		this.canvas.height = window.innerHeight;
		this.canvas.style.position = 'fixed';

		const ctx: CanvasRenderingContext2D = this.canvas.getContext('2d')!;
		ctx.imageSmoothingEnabled = false;

		this.ctx.save();

		this.ctx.globalAlpha = this.animationState.alpha;
		this.ctx.translate(this.canvas.width / 2 | 0, this.canvas.height / 2 | 0);
		this.ctx.scale(6, 6);
		this.ctx.clearRect(-40, -40, 80, 80);

		// Loading bar
		this.ctx.fillStyle = '#343434';
		this.ctx.fillRect(-11, 10, 22, 2);
		this.ctx.fillStyle = '#CCCCCC';
		this.ctx.fillRect(-11, 10, 22 * Math.min(this.animationState.percent, this.getProgress()), 2);

		// Logo
		this.ctx.scale(this.animationState.logoScale, this.animationState.logoScale);
		this.ctx.drawImage(this.logo, -10, -10);

		this.ctx.restore();
	}
}
