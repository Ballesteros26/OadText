// TODO step/render... abstract machen

import type Awaitable from '../Utils/Awaitable';
import { cancelContext, getCancellationSignal } from 'engine/Runtime/cancellation';

/**
 * Class to represent processes. Processes get updated via calling a step and
 * frame method. A process can have subprocesses as children. Their step and
 * frame methods are called before the corresponding parent method and in order
 * they are added to the partent.
 */
export default abstract class Process<out T> implements Awaitable<T> {
	private _finished = false;
	get finished() {
		return this._finished;
	}

	private _isSettled = false;
	private _promise: Promise<T> | null = null;
	private _resolve!: (value: any) => void;
	private _reject!: (error: Error) => void;
	public getPromise() {
		if (!this._promise) {
			const exitPromise = new Promise<T>((resolve, reject) => {
				this._resolve = resolve;
				this._reject = reject;
			});

			if (this.run) {
				const runPromise = this.run();
				runPromise
					.finally(() => {
						this._isSettled = true;
						this.destroy();
					})
					.catch(() => {});
				this._promise = Promise.race([runPromise, exitPromise]);
			} else {
				this._promise = exitPromise;
			}
		}
		return this._promise;
	}

	private parent: Process<unknown> | null = null;
	private firstChild: Process<unknown> | null = null;
	private lastChild: Process<unknown> | null = null;

	private nextChild: Process<unknown> | null = null;
	private prevChild: Process<unknown> | null = null;

	private _selfPaused = false;
	private _pausedParentsCount = 0;
	private _selfFramePaused = false;
	private _framePausedParentsCount = 0;

	get paused() {
		return this._pausedParentsCount > 0;
	}
	get framePaused() {
		return this._framePausedParentsCount > 0;
	}

	/**
	 * Pauses calling step of this process and its children.
	 *
	 * @param pauseFrame Whether calling `frame` should also be paused.
	 */
	public pause(pauseFrame = false) {
		if (!this._selfPaused) {
			this._selfPaused = true;
			this.addPausedCount(1);
		}
		if (!this._selfFramePaused && pauseFrame) {
			this._selfFramePaused = true;
			this.addFramePausedCount(1);
		}
	}
	/**
	 * Resumes updating the process.
	 */
	public resume() {
		if (this._selfPaused) {
			this._selfPaused = false;
			this.addPausedCount(-1);
		}
		if (this._selfFramePaused) {
			this._selfFramePaused = false;
			this.addFramePausedCount(-1);
		}
	}
	private addPausedCount(amount: number) {
		this._pausedParentsCount += amount;
		for (let child = this.firstChild; child; child = child.nextChild) {
			child.addPausedCount(amount);
		}
	}
	private addFramePausedCount(amount: number) {
		this._framePausedParentsCount += amount;
		for (let child = this.firstChild; child; child = child.nextChild) {
			child.addFramePausedCount(amount);
		}
	}

	private static nextCreatedIndex = 0;
	private createdindex = -1;

	/**
	 * Creates and adds the result as a child to the process. Children get
	 * updated before their parent and in the order they are added.
	 *
	 * @returns The child that was added.
	 */
	public createProcess<T extends Process<unknown>, U extends any[]>(
		constructor: { new (...args: U): T },
		...args: U
	): T {
		// eslint-disable-next-line quack-engine/no-direct-process-creation
		const process = new constructor(...args);
		process.createdindex = Process.nextCreatedIndex++;
		this.addChild(process);
		// Create _promise
		process.getPromise();
		return process;
	}

	/**
	 * This method gets called the first time `.getPromise` is called or the
	 * Process is added to another one as child.
	 *
	 * It can be aborted by calling `.exit` or `.destroy`.
	 *
	 * If `run` is not implemented `.getPromise` returns a `Promise` that can
	 * only be resolved/rejected by calling `.exit`/`.destroy`.
	 */
	protected run?(): Promise<T>;
	protected step(delta?: number) {}
	protected frame() {}

	/**
	 * End updating the process and its children, calls the leave method and
	 * resolves the promise with the given parameter.
	 *
	 * @param value The value to call leave and to resolve the promise
	 */
	protected exit(value: T) {
		if (!this._isSettled) {
			this._isSettled = true;
			this._resolve(value);
			// destroy synchonously
			this.destroy();
		} else {
			console.warn("Called '.exit' on a finished instance of Process");
		}
	}

	/**
	 * Cancels the execution of all async functions running with the context of
	 * this process or any of its children.
	 *
	 * If the Process is not finished yet, it will make its promise to throw a
	 * CancellationError.
	 *
	 * Important: Call `super` when overriding this method.
	 */
	public destroy() {
		if (this._finished) {
			return;
		}
		this._finished = true;

		for (let child = this.firstChild; child; child = child.nextChild) {
			child.destroy();
		}

		if (this.parent) {
			this.parent.removeChild(this);
		}

		cancelContext(this);
		if (!this._isSettled) {
			this._isSettled = true;
			// prevent unhandled rejection event
			this._promise?.catch(() => {});
			this._reject(getCancellationSignal(this).reason);
		}
	}

	/**
	 * Adds a child to the process. Children get updated before their parent and
	 * in order they are added.
	 *
	 * @param child The child to add
	 */
	private addChild(child: Process<unknown>) {
		child.parent = this;

		if (this.lastChild) {
			this.lastChild.nextChild = child;
			child.prevChild = this.lastChild;
		} else {
			this.firstChild = child;
		}
		this.lastChild = child;
	}
	/**
	 * Removes a child from the process. It doesn't get updated any longer and
	 * can not be reassigned to another process.
	 *
	 * @param child The Process to remove
	 */
	private removeChild(child: Process<unknown>) {
		if (!child.nextChild) {
			this.lastChild = child.prevChild;
		} else {
			child.nextChild.prevChild = child.prevChild;
		}
		if (!child.prevChild) {
			this.firstChild = child.nextChild;
		} else {
			child.prevChild.nextChild = child.nextChild;
		}
		// keep nextChild when removed while callInPostOrder is called
		child.prevChild = null;
		child.parent = null;
	}

	/**
	 * Calls `callback` on every node whose ancestors (including itself) passes
	 * `predicate` in depth-first post-order.
	 * (see https://en.wikipedia.org/wiki/Tree_traversal)
	 *
	 * @param root root of the tree to traverse
	 * @param callback function that is called on the nodes
	 * @param predicate function to test each element of the tree
	 */
	private static callInPostOrder(
		root: Process<unknown>,
		callback: (process: Process<unknown>) => void,
		predicate: (process: Process<unknown>) => boolean,
	) {
		if (!predicate(root)) {
			return;
		}
		const stack: Process<unknown>[] = [];
		let process = root as Process<unknown> | null;
		while (true) {
			for (let child = process; child; child = child.firstChild) {
				while (child && !predicate(child)) {
					child = child.nextChild;
				}
				if (!child) {
					break;
				}
				stack.push(child);
			}
			process = stack.pop()!;
			if (predicate(process)) {
				callback(process);
			}
			if (process === root) {
				return;
			}
			process = process.nextChild;
		}
	}

	/**
	 * Calls `step` on every node whose ancestors (including itself) are neither
	 * paused nor completed in depth-first post-order.
	 * (see https://en.wikipedia.org/wiki/Tree_traversal)
	 *
	 * @param root root of the tree to traverse
	 */
	public static callStep(root: Process<unknown>, delta) {
		const nextCreatedIndexAtStart = Process.nextCreatedIndex;
		Process.callInPostOrder(
			root,
			process => process.step(delta),
			process => !process.paused && !process.finished && process.createdindex < nextCreatedIndexAtStart,
		);
	}

	/**
	 * Calls `frame` on every node whose ancestors (including itself) are not
	 * completed (including paused processes!).
	 * (see https://en.wikipedia.org/wiki/Tree_traversal)
	 *
	 * @param root root of the tree to traverse
	 */
	public static callFrame(root: Process<unknown>) {
		const nextCreatedIndexAtStart = Process.nextCreatedIndex;
		Process.callInPostOrder(
			root,
			process => process.frame(),
			process => !process.framePaused && !process.finished && process.createdindex < nextCreatedIndexAtStart,
		);
	}

	/**
	 * Prints the process tree recursively on the console.
	 */
	public log() {
		console.group.call(
			console,
			'%c' + this.constructor.name,
			this._selfPaused ? 'text-decoration: line-through' : '',
		);

		for (let child = this.firstChild; child !== null; child = child.nextChild) {
			child.log();
		}

		console.groupEnd();
	}
}
