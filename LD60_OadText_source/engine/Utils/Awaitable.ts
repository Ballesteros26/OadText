//TODO remove this useless stuff?

interface Awaitable<T> {
	getPromise: () => Promise<T>;
}

export default Awaitable;
