import rule from '../../../../lib/rules/ImmediatePromise/call-getOrdinaryPromise-on-return.ts';
import { getRuleTester, prefixTestCase } from '../../utils.ts';

const ruleTester = getRuleTester();

const prefixImmediatePromiseDeclaration =
	prefixTestCase(`import ImmediatePromise from 'engine/ImmediatePromise/ImmediatePromise';
const immediatePromise = new ImmediatePromise(() => {});`);

ruleTester.run('call-getOrdinaryPromise-on-return', rule, {
	valid: [
		{ code: 'await immediatePromise' },
		{ code: 'function f () { return immediatePromise }' },
		{ code: 'let f = function () { return immediatePromise }' },
		{ code: 'let f = () => immediatePromise' },
		{ code: 'let f = () => { return immediatePromise }' },
		{ code: 'let f = async function () { await immediatePromise }' },
		{ code: 'let f = async () => { await immediatePromise }' },
	].map(prefixImmediatePromiseDeclaration),
	invalid: ([
		{
			code: 'async function f () { return immediatePromise }',
			output: 'async function f () { return immediatePromise.getOrdinaryPromise() }',
			errors: [{ messageId: 'useGetOrdinaryPromise' }],
		},
		{
			code: 'async function f () { return new ImmediatePromise(() => {}) }',
			output: 'async function f () { return new ImmediatePromise(() => {}).getOrdinaryPromise() }',
			errors: [{ messageId: 'useGetOrdinaryPromise' }],
		},
		{
			code: 'async function f () { return await immediatePromise }',
			output: 'async function f () { return await immediatePromise.getOrdinaryPromise() }',
			errors: [{ messageId: 'useGetOrdinaryPromise' }],
		},
		{
			code: 'async function f () { return await await immediatePromise }',
			output: 'async function f () { return await await immediatePromise.getOrdinaryPromise() }',
			errors: [{ messageId: 'useGetOrdinaryPromise' }],
		},
		{
			code: 'let f = async function () { return immediatePromise }',
			output: 'let f = async function () { return immediatePromise.getOrdinaryPromise() }',
			errors: [{ messageId: 'useGetOrdinaryPromise' }],
		},
		{
			code: 'let f = async () => immediatePromise',
			output: 'let f = async () => immediatePromise.getOrdinaryPromise()',
			errors: [{ messageId: 'useGetOrdinaryPromise' }],
		},
		{
			code: 'let f = async () => { return immediatePromise }',
			output: 'let f = async () => { return immediatePromise.getOrdinaryPromise() }',
			errors: [{ messageId: 'useGetOrdinaryPromise' }],
		},
	] as const).map(prefixImmediatePromiseDeclaration),
});
