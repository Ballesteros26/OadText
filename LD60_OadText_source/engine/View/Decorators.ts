import { memo, type ReactNode } from 'react';

type componentOptions<T, P> = {
	/**
	 * Manually specify whether the component should re-render.
	 *
	 * There is no guarantee that the component will be skipped as memoization
	 * is only a performance optimization.
	 */
	shouldUpdate?: (instance: T, nextProps: P, nextState: P) => boolean;
};

/**
 * Binds a method to instances of a class to allow calling them in JSX syntax.
 */
export function component<T, P>(options?: componentOptions<T, P>) {
	const shouldUpdate = options?.shouldUpdate;

	return (
		value: (props: P) => ReactNode,
		context: ClassMethodDecoratorContext<T>,
	) => {
		const methodName = context.name;
		if (context.private) {
			throw new Error(`'component' cannot decorate private properties like ${methodName as string}.`);
		}
		context.addInitializer(function(this: any) {
			// TODO proper HMR support for decorators
			// e.g. when options of a decorator change, the method should be
			// rebound or the function body should be replaced (will result in
			// a new component instance otherwise)
			let value = import.meta.hot
				? (...args) => {
					const proto = Object.getPrototypeOf(this);
					return proto[methodName].apply(this, args);
				}
				: this[methodName].bind(this);

			if (shouldUpdate != null) {
				value = memo(value, (prevProps, nextProps) => {
					return !shouldUpdate(this, prevProps, nextProps);
				});
			}

			Object.defineProperty(this, methodName, {
				value,
				// deleting the property would make unbound method accessible
				configurable: false,
				// keep method nonenumerable
				enumerable: false,
				// one could make it more strict by setting writable to false
				writable: true,
			});
		});
	};
}
