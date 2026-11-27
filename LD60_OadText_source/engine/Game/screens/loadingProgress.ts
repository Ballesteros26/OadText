let total = 0;
let loaded = 0;

// emitted from progress-loader
window.addEventListener('moduleRequested', () => total++);
window.addEventListener('moduleLoaded', () => loaded++);

export function getProgress() {
	return total === 0 ? 0 : loaded / total;
}
