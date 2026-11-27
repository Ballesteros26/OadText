function isValidContext(context: unknown): context is object {
	return typeof context === 'object' && context != null;
}

/**
 * Signals that a context has been cancelled by {@link cancelContext}.
 */
export class CancellationError extends Error {
	constructor(public context: object) {
		super('Context has been cancelled.');
		this.name = 'CancellationError';
	}
}

const controllerMap = new WeakMap<object, AbortController>();

function getCancellationController(context: object) {
	if (!controllerMap.has(context)) {
		controllerMap.set(context, new AbortController());
	}
	return controllerMap.get(context)!;
}

/**
 * Cancels the given context.
 *
 * All async functions running with this context will be aborted and will throw
 * a {@link CancellationError}. `finally` blocks still get executed.
 */
export function cancelContext(context: object) {
	const controller = getCancellationController(context);

	if (!controller.signal.aborted) {
		controller.abort(new CancellationError(context));
	}
}

/**
 * Returns a {@link AbortSignal} indicating whether {@link cancelContext} got
 * called on the given context.
 */
export function getCancellationSignal(context: object): AbortSignal;
export function getCancellationSignal(context: unknown): AbortSignal | undefined;
export function getCancellationSignal(context: unknown) {
	if (!isValidContext(context)) {
		return undefined;
	}
	return getCancellationController(context).signal;
}
