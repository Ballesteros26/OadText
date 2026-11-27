import { describe, expect, it, vi } from 'vitest';

import Process from 'engine/Process/Process';
import { expectCallOrder } from '../__utils';
import { bindPromiseRejectionEventsHandler } from '../__polyfills/promiseRejectionEvents';

function createFakes(length: number) {
	return new Array(length)
		.fill(0)
		.map(() => vi.fn());
}

describe('Process', () => {
	describe('callStep', () => {
		class ProcessWithStep extends Process<void> {
			constructor(private cb: () => void) {
				super();
			}
			protected step(_delta?: number): void {
				this.cb();
			}
		}

		it('calls step in depth-first post-order', () => {
			const [a, b, c, d, e, f, g] = createFakes(7);

			const A = new ProcessWithStep(a);

			const B = A.createProcess(ProcessWithStep, b);
			const C = A.createProcess(ProcessWithStep, c);

			B.createProcess(ProcessWithStep, d);
			B.createProcess(ProcessWithStep, e);
			C.createProcess(ProcessWithStep, f);
			C.createProcess(ProcessWithStep, g);

			Process.callStep(A, 0);

			expectCallOrder(d, e, b, f, g, c, a);
		});

		describe('destroying childs while traversing', () => {
			it('destroyed process does not get called', () => {
				const [a, b, c, d, e, f, g] = createFakes(7);

				const A = new ProcessWithStep(a);

				const B = A.createProcess(ProcessWithStep, b);
				const C = A.createProcess(ProcessWithStep, c);

				B.createProcess(ProcessWithStep, () => {
					d();
					C.destroy();
					E.destroy();
				});
				const E = B.createProcess(ProcessWithStep, e);
				C.createProcess(ProcessWithStep, f);
				C.createProcess(ProcessWithStep, g);

				Process.callStep(A, 0);

				expectCallOrder(d, b, a);
				expect(c).not.toHaveBeenCalled();
				expect(e).not.toHaveBeenCalled();
				expect(f).not.toHaveBeenCalled();
				expect(g).not.toHaveBeenCalled();
			});

			it('parent of current process can be destroyed', () => {
				const [a, b, c, d, e, f, g] = createFakes(7);

				const A = new ProcessWithStep(a);

				const B = A.createProcess(ProcessWithStep, b);
				const C = A.createProcess(ProcessWithStep, c);

				B.createProcess(ProcessWithStep, () => {
					d();
					B.destroy();
				});
				B.createProcess(ProcessWithStep, e);
				C.createProcess(ProcessWithStep, f);
				C.createProcess(ProcessWithStep, g);

				Process.callStep(A, 0);

				expectCallOrder(d, f, g, c, a);
				expect(b).not.toHaveBeenCalled();
				expect(e).not.toHaveBeenCalled();
			});
		});

		describe('pausing childs while traversing', () => {
			it('paused process does not get called', () => {
				const [a, b, c, d, e, f, g] = createFakes(7);

				const A = new ProcessWithStep(a);

				const B = A.createProcess(ProcessWithStep, b);
				const C = A.createProcess(ProcessWithStep, c);

				B.createProcess(ProcessWithStep, () => {
					d();
					C.pause();
					E.pause();
				});
				const E = B.createProcess(ProcessWithStep, e);
				C.createProcess(ProcessWithStep, f);
				C.createProcess(ProcessWithStep, g);

				Process.callStep(A, 0);

				expectCallOrder(d, b, a);
				expect(c).not.toHaveBeenCalled();
				expect(e).not.toHaveBeenCalled();
				expect(f).not.toHaveBeenCalled();
				expect(g).not.toHaveBeenCalled();
			});

			it('parent of current process can be paused', () => {
				const [a, b, c, d, e, f, g] = createFakes(7);

				const A = new ProcessWithStep(a);

				const B = A.createProcess(ProcessWithStep, b);
				const C = A.createProcess(ProcessWithStep, c);

				B.createProcess(ProcessWithStep, () => {
					d();
					B.pause();
				});
				B.createProcess(ProcessWithStep, e);
				C.createProcess(ProcessWithStep, f);
				C.createProcess(ProcessWithStep, g);

				Process.callStep(A, 0);

				expectCallOrder(d, f, g, c, a);
				expect(b).not.toHaveBeenCalled();
				expect(e).not.toHaveBeenCalled();
			});
		});

		describe('creating childs while traversing', () => {
			it('created processes will not get called immediately', () => {
				const [a, b, c, d, e] = createFakes(5);

				const A = new ProcessWithStep(a);

				const B = A.createProcess(ProcessWithStep, b);

				B.createProcess(ProcessWithStep, () => {
					d();
					A.createProcess(ProcessWithStep, c);
					B.createProcess(ProcessWithStep, e);
				});

				Process.callStep(A, 0);

				expect(c).not.toHaveBeenCalled();
				expect(e).not.toHaveBeenCalled();
			});

			it('created processes will get called next round', () => {
				const [a, b, c, d, e] = createFakes(5);

				const A = new ProcessWithStep(a);

				const B = A.createProcess(ProcessWithStep, b);

				B.createProcess(ProcessWithStep, () => {
					d();
					A.createProcess(ProcessWithStep, c);
					B.createProcess(ProcessWithStep, e);
				});

				Process.callStep(A, 0);
				Process.callStep(A, 0);

				expect(c).toHaveBeenCalledOnce();
				expect(e).toHaveBeenCalledOnce();
			});

			it('created processes will get called next round 2', () => {
				const [a, b, c, d, e] = createFakes(5);

				let secondRoundCalled = false;

				const A = new ProcessWithStep(a);

				const B = A.createProcess(ProcessWithStep, b);

				B.createProcess(ProcessWithStep, () => {
					d();
					A.createProcess(ProcessWithStep, c);
					B.createProcess(ProcessWithStep, e);
					if (!secondRoundCalled) {
						secondRoundCalled = true;
						Process.callStep(A, 0);
					}
				});

				Process.callStep(A, 0);

				expect(c).toHaveBeenCalledOnce();
				expect(e).toHaveBeenCalledOnce();
			});
		});
	});

	describe('unhandledrejection events', () => {
		describe('does not throw unhandledrejection on exit', () => {
			it('basic case', async () => {
				class A extends Process<number> {
					public step() {
						this.exit(0);
					}
				}
				using unhandledrejection = bindPromiseRejectionEventsHandler('unhandledrejection', vi.fn());

				const a = new A();
				const promise = a.getPromise();
				Process.callStep(a, 0);
				await promise;
				await new Promise(r => setTimeout(r, 1)); // 0 does not work in Firefox

				expect(unhandledrejection.handler).not.toHaveBeenCalled();
			});

			it('with run method', async () => {
				class A extends Process<number> {
					public async run() {
						await new Promise(() => {});
						return 0;
					}
					public step() {
						this.exit(0);
					}
				}

				using unhandledrejection = bindPromiseRejectionEventsHandler('unhandledrejection', vi.fn());

				const a = new A();
				const promise = a.getPromise();
				Process.callStep(a, 0);
				await promise;
				await new Promise(r => setTimeout(r, 1)); // 0 does not work in Firefox

				expect(unhandledrejection.handler).not.toHaveBeenCalled();
			});
		});

		it('emits unhandledrejection when run() throws', async () => {
			class A extends Process<number> {
				public async run() {
					throw new Error('TestError');
				}
			}

			using unhandledrejection = bindPromiseRejectionEventsHandler('unhandledrejection', vi.fn());

			const a = new A();
			a.getPromise();
			await new Promise(r => setTimeout(r, 1)); // 0 does not work in Firefox

			expect(unhandledrejection.handler.mock.calls[0][0]).toMatchObject({
				reason: {
					message: 'TestError',
				},
			});
		});
	});
});
