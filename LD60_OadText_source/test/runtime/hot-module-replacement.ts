import { describe, it, assert } from 'vitest';

import { hotClass } from 'engine/Runtime/__internal/hot';

describe('Hot Module Replacement', () => {
	describe('Prototype replacement', () => {
		describe('basic functionality', () => {
			it('prototype replacement on existing instance', () => {
				const cache = {};

				const A = hotClass('A', false, undefined, cache)(class A {
					getValue() {
						return 1;
					}
				});
				const a = new A();

				hotClass('A', false, cache, {})(class A {
					getValue() {
						return 2;
					}
				});
				assert.strictEqual(a.getValue(), 2);
			});

			it('prototype replacement without existing instance', () => {
				const cache = {};

				const A = hotClass('A', false, undefined, cache)(class A {
					getValue() {
						return 1;
					}
				});

				hotClass('A', false, cache, {})(class A {
					getValue() {
						return 2;
					}
				});

				const a = new A();
				assert.strictEqual(a.getValue(), 2);
			});

			it('multiple replacements', () => {
				const cache1 = {};
				const cache2 = {};

				const A = hotClass('A', false, undefined, cache1)(class A {
					getValue() {
						return 1;
					}
				});
				hotClass('A', false, cache1, cache2)(class A {
					getValue() {
						return 2;
					}
				});
				hotClass('A', false, cache2, {})(class A {
					getValue() {
						return 3;
					}
				});

				const a = new A();
				assert.strictEqual(a.getValue(), 3);
			});
		});

		describe('class matching', () => {
			it('matching by name', () => {
				const cache = {};

				const A = hotClass('A', false, undefined, cache)(class A {
					getValue() {
						return 1;
					}
				});
				const a = new A();

				hotClass('B', false, cache, {})(class A {
					getValue() {
						return 2;
					}
				});

				assert.strictEqual(a.getValue(), 1);
			});

			it('matching by default export', () => {
				const cache = {};

				const A = hotClass('A', true, undefined, cache)(class A {
					getValue() {
						return 1;
					}
				});
				const a = new A();

				hotClass(undefined, true, cache, {})(class A {
					getValue() {
						return 2;
					}
				});
				assert.strictEqual(a.getValue(), 2);
			});
		});

		describe('matching does only appear inside of cache', () => {
			it('names do not leak out of cache', () => {
				const A1 = hotClass('A', false, undefined, {})(class A {
					getValue() {
						return 1;
					}
				});
				const a1 = new A1();

				const A2 = hotClass('A', false, {}, {})(class A {
					getValue() {
						return 2;
					}
				});
				const a2 = new A2();

				assert.strictEqual(a1.getValue(), 1);
				assert.strictEqual(a2.getValue(), 2);
			});

			it('default exports do not leak out of cache', () => {
				const A1 = hotClass('A', true, undefined, {})(class A {
					getValue() {
						return 1;
					}
				});
				const a1 = new A1();

				const A2 = hotClass('B', true, {}, {})(class A {
					getValue() {
						return 2;
					}
				});
				const a2 = new A2();

				assert.strictEqual(a1.getValue(), 1);
				assert.strictEqual(a2.getValue(), 2);
			});
		});

		it('instanceof operator works', () => {
			const cache = {};

			const A1 = hotClass('A', false, undefined, cache)(class A {
				getValue() {
					return 1;
				}
			});
			const a1 = new A1();

			const A2 = hotClass('A', false, cache, {})(class A {
				getValue() {
					return 2;
				}
			});
			const a2 = new A2();

			assert(a1 instanceof A1);
			assert(a1 instanceof A2);
			assert(a2 instanceof A1);
			assert(a2 instanceof A2);
		});

		it('works with inheritance', () => {
			const cache = {};

			const D = hotClass('D', false, undefined, cache)(class D {
				getValueD() {
					return 1;
				}
			});
			const C = hotClass('C', false, undefined, cache)(class C {
				getValueC() {
					return 2;
				}
			});
			const B = hotClass('B', false, undefined, cache)(class B extends C {
				getValueB() {
					return 3;
				}
			});
			const A = hotClass('A', false, undefined, cache)(class A extends B {
				getValueA() {
					return 4;
				}
			});
			const a = new A();

			hotClass('B', false, cache, {})(class B extends C {
				getValueB() {
					return 5;
				}
			});
			assert.strictEqual(a.getValueA(), 4);
			assert.strictEqual(a.getValueB(), 5);
			assert.strictEqual(a.getValueC(), 2);

			hotClass('B', false, cache, {})(class B extends D {
				getValueB() {
					return 6;
				}
			});
			assert.strictEqual(a.getValueA(), 4);
			assert.strictEqual(a.getValueB(), 6);
			assert.strictEqual(a.getValueC, undefined);
			assert.strictEqual((<any>a).getValueD(), 1);
		});

		describe('uncontrolled class', () => {
			it('with existing instance', () => {
				const cache = {};
				class B {
					getValueB() {
						return 1;
					}
				}
				const A = hotClass('A', false, undefined, cache)(class A extends B {
					getValueA() {
						return 2;
					}
				});
				const a = new A();

				hotClass('A', false, cache, {})(class A extends B {
					getValueA() {
						return 3;
					}
				});

				assert.strictEqual(a.getValueA(), 3);
				assert.strictEqual(a.getValueB(), 1);
			});

			it('without existing instance', () => {
				const cache = {};
				class B {
					getValueB() {
						return 1;
					}
				}
				const A = hotClass('A', false, undefined, cache)(class A extends B {
					getValueA() {
						return 2;
					}
				});

				hotClass('A', false, cache, {})(class A extends B {
					getValueA() {
						return 3;
					}
				});

				const a = new A();
				assert.strictEqual(a.getValueA(), 3);
				assert.strictEqual(a.getValueB(), 1);
			});
		});

		it('static members are accessible', () => {
			const A = hotClass('A', false, undefined, {})(class A {
				static value = 2;
			});
			assert.deepStrictEqual(A.value, 2);
		});
	});
});
