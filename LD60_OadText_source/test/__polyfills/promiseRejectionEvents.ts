type PromiseRejectionEventTypes = 'rejectionhandled' | 'unhandledrejection';

type PromiseRejectionEventInit = {
	promise: Promise<unknown>;
	reason?: unknown;
};

class PromiseRejectionEventPolyfill extends Event {
	public readonly promise: Promise<unknown>;
	public readonly reason: unknown;

	public constructor(type: PromiseRejectionEventTypes, options: PromiseRejectionEventInit) {
		super(type);

		this.promise = options.promise;
		this.reason = options.reason;
	}
}

const unhandledRejectionCallback: NodeJS.UnhandledRejectionListener = (reason, promise) => {
	window.dispatchEvent(new PromiseRejectionEventPolyfill('unhandledrejection', {
		reason,
		promise,
	}));
};
const rejectionHandledCallback: NodeJS.RejectionHandledListener = (promise) => {
	window.dispatchEvent(new PromiseRejectionEventPolyfill('rejectionhandled', {
		promise,
	}));
};

// @ts-expect-error
Symbol.dispose ??= Symbol('Symbol.dispose');
// @ts-expect-error
Symbol.asyncDispose ??= Symbol('Symbol.asyncDispose');

let bindingCount = 0;

export function bindPromiseRejectionEventsHandler<T extends (e: PromiseRejectionEvent) => void>(
	type: PromiseRejectionEventTypes,
	handler: T,
) {
	// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- not defined in node environment
	if (window.PromiseRejectionEvent == null && bindingCount++ == 0) {
		process.on('unhandledRejection', unhandledRejectionCallback);
		process.on('rejectionHandled', rejectionHandledCallback);
	}

	window.addEventListener(type, handler);

	const result = {
		handler,
		[Symbol.dispose]: () => {
			window.removeEventListener(type, handler);
			// @ts-expect-error throw NPE when handler is accessed after listener is removed
			result.handler = null;

			// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- not defined in node environment
			if (window.PromiseRejectionEvent == null && --bindingCount === 0) {
				process.off('unhandledRejection', unhandledRejectionCallback);
				process.off('rejectionHandled', rejectionHandledCallback);
			}
		},
	};
	return result;
}
