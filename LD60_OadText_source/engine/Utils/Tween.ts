//TODO functionen reinhauen

import Process from '../Process/Process';
import type Interpolative from './Interpolative';

/*type Interpolative<T> = {
	[P in keyof T]?: number// | Partial<Interpolative<T[P]>>;//mit 2tem lässt es wieder alle typen zu
};*/

type Tweenable<T> = {
	[P in keyof T]?: number | Interpolative | (Tweenable<T[P]> & object);
};

// enum Easing {
// 	OUT_CUBIC,
// 	IN_OUT_CUBIC,
// 	IN_QUART,
// 	OUT_QUART,
// 	IN_OUT_QUART,
// 	IN_QUINT,
// 	OUT_QUINT,
// 	IN_OUT_QUINT,
// 	IN_SINE,
// 	OUT_SINE,
// 	IN_OUT_SINE,
// 	IN_EXPO,
// 	OUT_EXPO,
// 	IN_OUT_EXPO,
// 	IN_CIRC,
// 	OUT_CIRC,
// 	IN_OUT_CIRC,
// 	IN_ELASTIC,
// 	OUT_ELASTIC,
// 	IN_OUT_ELASTIC,
// 	IN_BACK,
// 	OUT_BACK,
// 	IN_OUT_BACK,
// 	IN_BOUNCE,
// 	OUT_BOUNCE,
// 	IN_OUT_BOUNCE
// }

// var easingFunctions = [
// 	// outCubic
// 	t => (--t) * t * t + 1,
// 	// inOutCubic
// 	t => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
// 	// inQuart
// 	t => t * t * t * t,
// 	// outQuart
// 	t => 1 - (--t) * t * t * t,
// 	// inOutQuart
// 	t => t < 0.5 ? 8 * t * t * t * t : 1 - 8 * (--t) * t * t * t,
// 	// inQuint
// 	t => t * t * t * t * t,
// 	// outQuint
// 	t => 1 + (--t) * t * t * t * t,
// 	// inOutQuint
// 	t => t < 0.5 ? 16 * t * t * t * t * t : 1 + 16 * (--t) * t * t * t * t,
// 	// inSine
// 	t => -1 * Math.cos(t / 1 * (Math.PI * 0.5)) + 1,
// 	// outSine
// 	t => Math.sin(t / 1 * (Math.PI * 0.5)),
// 	// inOutSine
// 	t => -1 / 2 * (Math.cos(Math.PI * t) - 1),
// 	// inExpo
// 	t => (t === 0) ? 0 : Math.pow(2, 10 * (t - 1)),
// 	// outExpo
// 	t => (t == 1) ? 1 : (-Math.pow(2, -10 * t) + 1),
// 	// inOutExpo
// 	t => (t === 0) ? 0
// 		: (t === 1) ? 1
// 			: ((t *= 2) < 1) ? 1 / 2 * Math.pow(2, 10 * (t - 1))
// 				: 1 / 2 * (-Math.pow(2, -10 * --t) + 2),//?? besser
// 	// inCirc
// 	t => -1 * (Math.sqrt(1 - t * t) - 1),
// 	// outCirc
// 	t => Math.sqrt(1 - (t = t - 1) * t),
// 	// inOutCirc
// 	null,
// 	/*t => ((t *= 2) < 1) ? -1 / 2 * (Math.sqrt(1 - t * t) - 1)
// 		: 1 / 2 * (Math.sqrt(1 - (t -= 2) * t) + 1),
// 		if((t /= 1 / 2) < 1) return -1 / 2 * (Math.sqrt(1 - t * t) - 1);
// 		return 1 / 2 * (Math.sqrt(1 - (t -= 2) * t) + 1);
// 	,*/
// 	// inElastic
// 	null,
// 	/*	var s = 1.70158;
// 		var p = 0;
// 		var a = 1;
// 		if(t === 0) return 0;
// 		if(t === 1) return 1;
// 		if(!p) p = 0.3;
// 		if(a < 1) {
// 			a = 1;
// 			var s = p / 4;
// 		} else var s = p / (2 * Math.PI) * Math.asin(1 / a);
// 		return -(a * Math.pow(2, 10 * (t -= 1)) * Math.sin((t - s) * (2 * Math.PI) / p));
// 	,*/
// 	// outElastic
// 	null,
// 	/*	var s = 1.70158;
// 		var p = 0;
// 		var a = 1;
// 		if(t === 0) return 0;
// 		if(t === 1) return 1;
// 		if(!p) p = 0.3;
// 		if(a < 1) {
// 			a = 1;
// 			var s = p / 4;
// 		} else var s = p / (2 * Math.PI) * Math.asin(1 / a);
// 		return a * Math.pow(2, -10 * t) * Math.sin((t - s) * (2 * Math.PI) / p) + 1;
// 	,*/
// 	// inOutElastic
// 	null,
// 	/*	var s = 1.70158;
// 		var p = 0;
// 		var a = 1;
// 		if(t === 0) return 0;
// 		if((t /= 1 / 2) == 2) return 1;
// 		if(!p) p = (0.3 * 1.5);
// 		if(a < 1) {
// 			a = 1;
// 			var s = p / 4;
// 		} else var s = p / (2 * Math.PI) * Math.asin(1 / a);
// 		if(t < 1) return -0.5 * (a * Math.pow(2, 10 * (t -= 1)) * Math.sin((t - s) * (2 * Math.PI) / p));
// 		return a * Math.pow(2, -10 * (t -= 1)) * Math.sin((t - s) * (2 * Math.PI) / p) * 0.5 + 1;
// 	,*/
// 	// inBack(t, s=1.70158) {
// 	t => { let s = 1.70158; 1 * t * t * ((s + 1) * t - s) },
// 	// outBack(t, s=1.70158) {
// 	t => { let s = 1.70158; 1 * ((t = t / 1 - 1) * t * ((s + 1) * t + s) + 1) },
// 	// inOutBack(t, s=1.70158) {
// 	null,
// 	/*	if((t /= 1 / 2) < 1) return 1 / 2 * (t * t * (((s *= (1.525)) + 1) * t - s));
// 		return 1 / 2 * ((t -= 2) * t * (((s *= (1.525)) + 1) * t + s) + 2);
// 	,*/
// 	// inBounce
// 	t => 1 - this[Easing.OUT_BOUNCE](1 - t),
// 	// outBounce
// 	t => {
// 		if(t < 1 / 2.5) {
// 			return (6.25 * Math.pow(t, 2));
// 		}
// 		else if(t < 2 / 2.5) {
// 			return (6.25 * Math.pow(t - 1.5 / 2.5, 2) + 0.75);
// 		}
// 		else {
// 			return (6.25 * Math.pow(t - 2.25 / 2.5, 2) + 0.9375);
// 		};
// 	},

// 	/*	((t /= 1) < (1 / 2.75)) ?
// 			(7.5625 * t * t)
// 		: (t < (2 / 2.75)) ?
// 			(7.5625 * (t -= (1.5 / 2.75)) * t + 0.75)
// 		: (t < (2.5 / 2.75)) ?
// 			(7.5625 * (t -= (2.25 / 2.75)) * t + 0.9375)
// 		: (7.5625 * (t -= (2.625 / 2.75)) * t + 0.984375),
// 			*/
// 	/*	} else if(t < (2 / 2.75)) {
// 			return (7.5625 * (t -= (1.5 / 2.75)) * t + 0.75);
// 		} else if(t < (2.5 / 2.75)) {
// 			return (7.5625 * (t -= (2.25 / 2.75)) * t + 0.9375);
// 		} else {
// 			return (7.5625 * (t -= (2.625 / 2.75)) * t + 0.984375);
// 		}
// 	,*/
// 	// inOutBounce
// 	t => (t < 0.5) ? this[Easing.IN_BOUNCE](t * 2) * 0.5
// 		: this[Easing.OUT_BOUNCE](t * 2 - 1) * 0.5 + 0.5
// ];

export default class Tween<U extends {}, T extends U> extends Process<boolean> {
	// from https://gist.github.com/gre/1650294
	public static EasingFunctions = {
		// no easing, no acceleration
		linear: (t: number) => t,
		// accelerating from zero velocity
		easeInQuad: (t: number) => t * t,
		// decelerating to zero velocity
		easeOutQuad: (t: number) => t * (2 - t),
		// acceleration until halfway, then deceleration
		easeInOutQuad: (t: number) => t < .5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
		// accelerating from zero velocity
		easeInCubic: (t: number) => t * t * t,
		// decelerating to zero velocity
		easeOutCubic: (t: number) => (--t) * t * t + 1,
		// acceleration until halfway, then deceleration
		easeInOutCubic: (t: number) => t < .5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
		// accelerating from zero velocity
		easeInQuart: (t: number) => t * t * t * t,
		// decelerating to zero velocity
		easeOutQuart: (t: number) => 1 - (--t) * t * t * t,
		// acceleration until halfway, then deceleration
		easeInOutQuart: (t: number) => t < .5 ? 8 * t * t * t * t : 1 - 8 * (--t) * t * t * t,
		// accelerating from zero velocity
		easeInQuint: (t: number) => t * t * t * t * t,
		// decelerating to zero velocity
		easeOutQuint: (t: number) => 1 + (--t) * t * t * t * t,
		// acceleration until halfway, then deceleration
		easeInOutQuint: (t: number) => t < .5 ? 16 * t * t * t * t * t : 1 + 16 * (--t) * t * t * t * t,
	};

	//	private static pool: any[] = [];//Object[] = [];//TODO

	private object: T;
	private startValue: object; //TODO
	//private endValue: Interpolative<T> & Partial<T>;
	private endValue: object; //TODO

	private duration: number;
	private easing: (t: number) => number;

	private elapsed = 0;

	//constructor(object: T, endValue: Interpolative<T> & Partial<T>, duration: number, easing = Tween.EasingFunctions.linear, skipOn?: Promise<any>) {//TODO
	//constructor(object: T, endValue: object, duration: number, easing = Tween.EasingFunctions.linear, skipOn?: Promise<any>) {
	constructor(
		object: T,
		endValue: U & Tweenable<U>,
		duration: number,
		easing = Tween.EasingFunctions.linear,
		skipOn?: Promise<any>,
	) { //TODO ist das gut so? SChachtelung geht nicht
		super();

		this.object = object;
		this.startValue = {};
		this.endValue = endValue;
		this.duration = duration;
		this.easing = easing;

		for (const prop in this.endValue) {
			//		if(typeof this.object[prop] !== typeof this.endValue[prop]) {
			//			throw new Error("Invalid tween objects");
			// not 100% correct check
			//		} else
			if (this.object[prop].lerp && this.object[prop].copy) {
				// Interpolative(etwas unsauber)
				this.startValue[prop] = this.object[prop].copy();
			} else if (typeof this.object[prop] == 'object') {
				// Nested Object
				this.createProcess(
					Tween, //testen
					this.object[prop],
					this.endValue[prop],
					this.duration,
					this.easing,
					this.getPromise(),
				);
			} else {
				// Number
				this.startValue[prop] = this.object[prop];
			}
		}

		if (skipOn) {
			console.warn('skipOn parameter is deprecated in Tween constructor');
			// potential memory leak
			skipOn.then(() => {
				if (!this.finished) this.skip();
			});
		}
	}

	protected step(delta) {
		this.elapsed += delta;

		const process = this.easing(Math.min(this.elapsed / this.duration, 1));

		for (const prop in this.startValue) {
			//this.object[prop].lerp
			if (this.object[prop].lerp) {
				this.object[prop].lerp(this.startValue[prop], this.endValue[prop], process);
			} else {
				this.object[prop] = this.startValue[prop] + (this.endValue[prop] - this.startValue[prop]) * process; //TODO
			}
		}

		if (this.elapsed >= this.duration) {
			this.exit(true);
		}
	}

	public skip() {
		if (this.finished) return;

		Object.assign(this.object, this.endValue);
		this.exit(false);
	}
}
