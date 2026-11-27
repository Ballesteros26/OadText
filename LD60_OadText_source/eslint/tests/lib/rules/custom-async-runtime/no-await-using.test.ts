import rule from '../../../../lib/rules/custom-async-runtime/no-await-using.ts';
import { getRuleTester } from '../../utils.ts';

const ruleTester = getRuleTester();

ruleTester.run('no-await-using', rule, {
	valid: [
		// using still allowed
		{ code: 'async function f() { using a = value }' },
		{ code: 'const f = async function() { using a = value }' },
		{ code: 'const f = async () => { using a = value }' },
		{ code: 'const obj = { async f() { using a = value } }' },
		{ code: 'class A { async f() { using a = value } }' },

		// for of loops
		{ code: 'async function f() { for (using x of y) { } }' },
		{ code: 'async function f() { for await (using x of y) { } }' },

		// top level allowed
		{ code: 'await using a = value' },

		// allowed in invalid positions
		{ code: 'function f() { await using a = value }' },
		{ code: 'const f = function() { await using a = value }' },
		{ code: 'const f = () => { await using a = value }' },
		{ code: 'const obj = { f() { await using a = value } }' },
		{ code: 'class A { f() { await using a = value } }' },

		{ code: 'function* f() { await using a = value }' },
		{ code: 'const f = function*() { await using a = value }' },
		{ code: 'const obj = { *f() { await using a = value } }' },
		{ code: 'class A { *f() { await using a = value } }' },

		{ code: 'function f() { for (await using x of y) { } }' },
		{ code: 'function f() { for await (await using x of y) { } }' },

		{
			code: `async function f() {
	function g() {
		await using a = value
	}
}`,
		},
	],
	invalid: [
		{
			code: 'async function f() { await using a = value }',
			errors: [{ messageId: 'awaitUsingIsNotSupported' }],
		},
		{
			code: 'const f = async function() { await using a = value }',
			errors: [{ messageId: 'awaitUsingIsNotSupported' }],
		},
		{
			code: 'const f = async () => { await using a = value }',
			errors: [{ messageId: 'awaitUsingIsNotSupported' }],
		},
		{
			code: 'const obj = { async f() { await using a = value } }',
			errors: [{ messageId: 'awaitUsingIsNotSupported' }],
		},
		{
			code: 'class A { async f() { await using a = value } }',
			errors: [{ messageId: 'awaitUsingIsNotSupported' }],
		},
		{
			code: 'async function f() { await using a = value1, b = value2 }',
			errors: [{ messageId: 'awaitUsingIsNotSupported' }],
		},
		// for of loops
		{
			code: 'async function f() { for (await using x of y) { } }',
			errors: [{ messageId: 'awaitUsingIsNotSupported' }],
		},
		{
			code: 'async function f() { for await (await using x of y) { } }',
			errors: [{ messageId: 'awaitUsingIsNotSupported' }],
		},
	],
});
