import rule from '../../../../lib/rules/custom-async-runtime/no-async-generator-functions.ts';
import { getRuleTester } from '../../utils.ts';

const ruleTester = getRuleTester();

ruleTester.run('no-async-generator-functions', rule, {
	valid: [
		// function declaration
		{ code: 'function f() { }' },
		{ code: 'function* f() { }' },
		{ code: 'async function f() { }' },

		// function expression
		{ code: 'const f = function() { }' },
		{ code: 'const f = function*() { }' },
		{ code: 'const f = async function() { }' },

		// arrow functions
		{ code: 'const f = () => { }' },
		{ code: 'const f = async () => { }' },

		// methods
		{ code: 'const obj = { f() { } }' },
		{ code: 'const obj = { *f() { } }' },
		{ code: 'const obj = { async f() { } }' },

		{ code: 'class A { f() { } }' },
		{ code: 'class A { *f() { } }' },
		{ code: 'class A { async f() { } }' },
	],
	invalid: [
		{
			code: 'async function *f() { }',
			errors: [{ messageId: 'asyncGereratorFunctionsAreNotSupported' }],
		},
		{
			code: 'const f = async function*() { }',
			errors: [{ messageId: 'asyncGereratorFunctionsAreNotSupported' }],
		},
		{
			code: 'const obj = { async *f() { } }',
			errors: [{ messageId: 'asyncGereratorFunctionsAreNotSupported' }],
		},
		{
			code: 'class A { async *f() { } }',
			errors: [{ messageId: 'asyncGereratorFunctionsAreNotSupported' }],
		},
	],
});
