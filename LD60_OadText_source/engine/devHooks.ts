import Stats from 'stats.js';

type Pausable = {
	pause(): void;
	resume(): void;
};

// For better DX we will alter step and frame calls to keep the view in sync
// with the current state. This altered behavior can make certain bugs harder to
// debug, but probably more bugs easier to debug since we assume frame calls to
// have no relevant side effects.
// Stay in debugger mode once it got detected because of possible conditional
// debugger statements.
export let DEBUGGER_MODE = false;
const ASSUME_DEBUGGER_THRESHOLD = 100;

export function checkDebuggerMode(last: number) {
	const now = Date.now();
	if (!DEBUGGER_MODE && last >= 0 && now - last > ASSUME_DEBUGGER_THRESHOLD) {
		DEBUGGER_MODE = true;
		console.warn('Loop logic will be adjusted because debugger statement is assumed');
	}
	return now;
}

if (import.meta.hot) {
	var keyBindings: { key: string; title: string }[] = [];

	addKeybinding('F1', 'Publish build', () => {
		import.meta.hot?.send('dev-hooks:publish');
		console.log('publishing...');
	});

	var takeScreenshot = false;

	addKeybinding('F2', 'Make screenshot', () => {
		takeScreenshot = true;
	});

	var stats: any = null;
	var showingStats = false;

	// F3 does not work on Firefox for macOS
	addKeybinding('F3', '-');

	addKeybinding('F4', 'Help', () => {
		printKeybindings('HELP');
	});

	addKeybinding('F5', 'Create artifacts', () => {
		import.meta.hot?.send('dev-hooks:artifacts');
		console.log('creating artifacts...');
	});

	var paused = false;
	var pausables = new Set<WeakRef<Pausable>>();

	addKeybinding('F6', 'Pause/Resume', () => {
		pausables.forEach((ref) => {
			const pausable = ref.deref();
			if (pausable == null) {
				pausables.delete(ref);
				return;
			}
			if (paused) {
				pausable.resume();
			} else {
				pausable.pause();
			}
		});
		paused = !paused;
	});

	addKeybinding('F7', 'Docs', () => {
		import.meta.hot?.send('dev-hooks:docs');
		console.log('Opening docs...');
	});

	addKeybinding('F8', 'Show/Hide debug screen', () => {
		if (showingStats) {
			document.body.removeChild(stats.dom);
		} else {
			document.body.appendChild(stats.dom);
		}
		showingStats = !showingStats;
	});

	printKeybindings('DEVTOOLS');

	import.meta.hot.on('dev-hooks:message', (msg: string) => {
		console.log(msg);
	});
	import.meta.hot.on('dev-hooks:error', (err: string) => {
		console.error(err);
	});
	import.meta.hot.on('dev-hooks:open-url', (url: string) => {
		window.open(url);
	});
	import.meta.hot.on('dev-hooks:confirm', (msg: string) => {
		import.meta.hot?.send('dev-hooks:confirm', confirm(msg));
	});
}

function addKeybinding(key: string, title: string, cb?: () => void) {
	keyBindings.push({ key, title });
	if (cb == null) {
		return;
	}
	let keyDown = false;
	window.addEventListener('keydown', (e) => {
		if (e.code === key) {
			e.preventDefault();

			if (!keyDown) {
				keyDown = true;
				cb();
			}
		}
	});
	window.addEventListener('keyup', (e) => {
		if (e.code === key) {
			keyDown = false;
		}
	});
	window.addEventListener('blur', () => {
		keyDown = false;
	});
}
function printKeybindings(title: string) {
	console.groupCollapsed(` [${title}]`);
	for (const { key, title } of keyBindings) {
		console.log(` ${key}: ${title}`);
	}
	console.groupEnd();
}

export function offerScreenshot(canvas: HTMLCanvasElement) {
	if (takeScreenshot) {
		//https://www.khronos.org/message_boards/showthread.php/6821-Getting-a-pixel-in-webgl-area
		import.meta.hot?.send('dev-hooks:screenshot', canvas.toDataURL());
		console.log('creating screenshot...');

		takeScreenshot = false;
	}
}
export function getStats() {
	if (stats !== null) {
		throw new Error('Stats is requested twice.');
	}
	stats = new Stats();
	stats.showPanel(0);
	document.body.appendChild(stats.dom);
	showingStats = true;
	return stats;
}
export function registerPausable(pausable: Pausable) {
	if (paused) {
		pausable.pause();
	}
	pausables.add(new WeakRef(pausable));
}
