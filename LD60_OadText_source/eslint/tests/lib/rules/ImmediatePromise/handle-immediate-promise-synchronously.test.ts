import rule from '../../../../lib/rules/ImmediatePromise/handle-immediate-promise-synchronously.ts';
import { getRuleTester, prefixTestCase } from '../../utils.ts';

const ruleTester = getRuleTester();

const prefixImmediatePromiseDeclaration =
	prefixTestCase(`import ImmediatePromise from 'engine/ImmediatePromise/ImmediatePromise';

class A {
	method(): number;
}`);

ruleTester.run('handle-immediate-promise-synchronously', rule, {
	valid: [
		{ code: 'const a = new Promise(() => {})' },
		{ code: 'const a = new ImmediatePromise(() => {}).getOrdinaryPromise()' },
		{ code: 'new ImmediatePromise(() => {})' },
		{ code: 'Promise.resolve(new Promise(() => {}))' },
		{ code: 'Promise[resolve](new ImmediatePromise(() => {}))' },
		{ code: 'Promise.resolve(new ImmediatePromise(() => {}).getOrdinaryPromise())' },
		{ code: 'const a = { [new ImmediatePromise(() => {})]: 1 }' },
		{ code: 'class B { public b: ImmediatePromise<number> }' },
		{ code: 'async function f() { const a = await new ImmediatePromise(() => {}) }' },
		{ code: 'function f() { return [new ImmediatePromise(() => {})] }' },
		{ code: 'async function f() { return new ImmediatePromise(() => {}) }' },
	].map(prefixImmediatePromiseDeclaration),
	invalid: ([
		{
			code: 'const a = new ImmediatePromise(() => {})',
			errors: [{
				messageId: 'handleImmediatePromise',
				suggestions: [{
					messageId: 'useGetOrdinaryPromise',
					output: 'const a = new ImmediatePromise(() => {}).getOrdinaryPromise()',
				}],
			}],
		},
		{
			code: 'let a = new ImmediatePromise(() => {})',
			errors: [{
				messageId: 'handleImmediatePromise',
				suggestions: [{
					messageId: 'useGetOrdinaryPromise',
					output: 'let a = new ImmediatePromise(() => {}).getOrdinaryPromise()',
				}],
			}],
		},
		{
			code: 'var a = new ImmediatePromise(() => {})',
			errors: [{
				messageId: 'handleImmediatePromise',
				suggestions: [{
					messageId: 'useGetOrdinaryPromise',
					output: 'var a = new ImmediatePromise(() => {}).getOrdinaryPromise()',
				}],
			}],
		},
		{
			code: 'let a; a = new ImmediatePromise(() => {})',
			errors: [{
				messageId: 'handleImmediatePromise',
				suggestions: [{
					messageId: 'useGetOrdinaryPromise',
					output: 'let a; a = new ImmediatePromise(() => {}).getOrdinaryPromise()',
				}],
			}],
		},
		{
			code: 'var a; a = new ImmediatePromise(() => {})',
			errors: [{
				messageId: 'handleImmediatePromise',
				suggestions: [{
					messageId: 'useGetOrdinaryPromise',
					output: 'var a; a = new ImmediatePromise(() => {}).getOrdinaryPromise()',
				}],
			}],
		},
		{
			code: 'const a = [new ImmediatePromise(() => {})]',
			errors: [{
				messageId: 'handleImmediatePromise',
				suggestions: [{
					messageId: 'useGetOrdinaryPromise',
					output: 'const a = [new ImmediatePromise(() => {}).getOrdinaryPromise()]',
				}],
			}],
		},
		{
			code: 'const a = [[new ImmediatePromise(() => {})]]',
			errors: [{
				messageId: 'handleImmediatePromise',
				suggestions: [{
					messageId: 'useGetOrdinaryPromise',
					output: 'const a = [[new ImmediatePromise(() => {}).getOrdinaryPromise()]]',
				}],
			}],
		},
		{
			code: 'const a = { value: new ImmediatePromise(() => {}) }',
			errors: [{
				messageId: 'handleImmediatePromise',
				suggestions: [{
					messageId: 'useGetOrdinaryPromise',
					output: 'const a = { value: new ImmediatePromise(() => {}).getOrdinaryPromise() }',
				}],
			}],
		},
		{
			code: 'const a = {}; a.value = new ImmediatePromise(() => {})',
			errors: [{
				messageId: 'handleImmediatePromise',
				suggestions: [{
					messageId: 'useGetOrdinaryPromise',
					output: 'const a = {}; a.value = new ImmediatePromise(() => {}).getOrdinaryPromise()',
				}],
			}],
		},
		{
			code: 'class B { public b = new ImmediatePromise(() => {}) }',
			errors: [{
				messageId: 'handleImmediatePromise',
				suggestions: [{
					messageId: 'useGetOrdinaryPromise',
					output: 'class B { public b = new ImmediatePromise(() => {}).getOrdinaryPromise() }',
				}],
			}],
		},
		{
			code: 'async function f() { const a = await [new ImmediatePromise(() => {})] }',
			errors: [{
				messageId: 'handleImmediatePromise',
				suggestions: [{
					messageId: 'useGetOrdinaryPromise',
					output:
						'async function f() { const a = await [new ImmediatePromise(() => {}).getOrdinaryPromise()] }',
				}],
			}],
		},
		{
			code: 'async function f() { return [new ImmediatePromise(() => {})] }',
			errors: [{
				messageId: 'handleImmediatePromise',
				suggestions: [{
					messageId: 'useGetOrdinaryPromise',
					output: 'async function f() { return [new ImmediatePromise(() => {}).getOrdinaryPromise()] }',
				}],
			}],
		},
	] as const).map(prefixImmediatePromiseDeclaration),
});
