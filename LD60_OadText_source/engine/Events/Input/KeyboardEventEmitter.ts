import BaseEventEmitter from '../BaseEventEmitter';

// @formatter-ignore
const LETTERS = [
	'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M',
 	'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'
] as const;

// @formatter-ignore
const DIGITS = [
	'1', '2', '3', '4', '5', '6', '7', '8', '9', '0'
] as const;

// Warning: Always check browser compatibility: https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/code/code_values
const LETTER_KEY_CODES = LETTERS.map(l => `Key${l}` as const);
const DIGIT_KEY_CODES = DIGITS.map(d => `Digit${d}` as const);
const NUMPAD_KEY_CODES = DIGITS.map(d => `Numpad${d}` as const);
const ARROW_KEY_CODES = ['ArrowLeft', 'ArrowUp', 'ArrowRight', 'ArrowDown'] as const;
// @formatter-ignore
const OTHERS = [
	'Enter', 'Escape', 'Space',
	'ShiftLeft', 'ShiftRight',
	'ControlLeft', 'ControlRight',
	'AltLeft', 'AltRight'
] as const;

const KEY_CODES = new Set([
	...LETTER_KEY_CODES,
	...DIGIT_KEY_CODES,
	...NUMPAD_KEY_CODES,
	...ARROW_KEY_CODES,
	...OTHERS,
]);

type KeyCode = typeof KEY_CODES extends Set<infer U> ? U : string;

export function isValidKeyCode(value: any): value is KeyCode {
	return KEY_CODES.has(value);
}

interface KeyboardEventEmitterEvent {
	key: KeyCode;
	label: string;

	digital: true;
	value: 0 | 1;

	original: KeyboardEvent | null;
}

type KeyboardEventTypes = {
	keydown(e: KeyboardEventEmitterEvent): void;
	keyup(e: KeyboardEventEmitterEvent): void;
};

export default class KeyboardEventEmitter extends BaseEventEmitter<KeyboardEventTypes> {
	private pressing: Set<KeyCode> = new Set();
	private labels: Map<string, string> = new Map();

	private keydownHandler = (e: KeyboardEvent) => {
		const code = e.code;

		// keep functionality for F## buttons
		if (/F\d+/.test(e.code)) {
			return;
		}

		if (!isValidKeyCode(code)) {
			if (__DEV__) {
				console
					.warn(`KeyboardEventEmitter: "${code}" is not registered as valid key code and is therefore ignored.
If this key should not be ignored you can add it to the list of valid key codes "KEY_CODES".`);
			}
			return;
		}

		// keep functionality of ctrl+shift+[]
		if (!(e.ctrlKey && e.shiftKey)) {
			e.preventDefault();
		}

		if (!this.pressing.has(code)) {
			if (!this.labels.has(code)) {
				this.labels.set(code, e.key);
			}

			this.pressing.add(code);

			super.emit('keydown', {
				key: code,
				label: e.key,

				digital: true,
				value: 1,

				original: e,
			});
		}
	};
	private keyupHandler = (e: KeyboardEvent) => {
		const code = e.code;

		// keep functionality for F## buttons
		if (/F\d+/.test(code)) {
			return;
		}

		if (!isValidKeyCode(code)) {
			return;
		}

		e.preventDefault();

		// can already be false if window had lost focus
		if (this.pressing.delete(code)) {
			super.emit('keyup', {
				key: code,
				label: e.key,

				digital: true,
				value: 0,

				original: e,
			});
		}
	};
	private blurHandler = () => {
		this.releaseAllKeys();
	};
	public releaseAllKeys() {
		for (const code of this.pressing) {
			this.pressing.delete(code);

			super.emit('keyup', {
				key: code,
				label: this.labels.get(code)!,

				digital: true,
				value: 0,

				original: null,
			});
		}
	}

	private initializeEventListeners() {
		window.addEventListener('keydown', this.keydownHandler);
		window.addEventListener('keyup', this.keyupHandler);
		window.addEventListener('blur', this.blurHandler);
		window.addEventListener('contextmenu', this.blurHandler);
	}
	private removeEventListeners() {
		window.removeEventListener('keydown', this.keydownHandler);
		window.removeEventListener('keyup', this.keyupHandler);
		window.removeEventListener('blur', this.blurHandler);
		window.removeEventListener('contextmenu', this.blurHandler);
	}

	constructor() {
		super();
		this.initializeEventListeners();
	}

	public destroy() {
		this.removeEventListeners();

		if (this.eventNames().length > 0) {
			const eventList = this.eventNames()
				.map(a => `'${a.toString()}'`)
				.reduce((a, b) => `${a}, ${b}`);
			console.warn(`Destroyed KeyboardEventEmitter still has listeners for: ${eventList}.`);
		}
	}
}
