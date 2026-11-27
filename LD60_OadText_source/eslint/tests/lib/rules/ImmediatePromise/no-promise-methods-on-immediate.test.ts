import rule from '../../../../lib/rules/ImmediatePromise/no-promise-methods-on-immediate.ts';
import { getRuleTester, prefixTestCase } from '../../utils.ts';

const ruleTester = getRuleTester();

const prefixImmediatePromiseDeclaration =
	prefixTestCase(`import ImmediatePromise from 'engine/ImmediatePromise/ImmediatePromise';

class A {
	method(): number;
}

const immediatePromise = new ImmediatePromise(() => {});`);

ruleTester.run('no-promise-methods-on-immediate', rule, {
	valid: [
		// reject
		{ code: 'Promise.reject(immediatePromise)' },
		// resolve
		{ code: 'Promise.resolve()' },
		{ code: 'Promise.resolve("value")' },
		{ code: 'Promise.resolve(new Promise(() => {}))' },
		{ code: 'Promise[resolve](immediatePromise)' },
		{ code: 'Promise.resolve(immediatePromise.getOrdinaryPromise())' },
		{ code: 'Promise.resolve(immediatePromise as A)' },
		// all
		{ code: 'Promise.all(["value", new Promise(() => {})])' },
		{ code: 'ImmediatePromise.all([immediatePromise])' },
		{ code: 'Promise.all([immediatePromise.getOrdinaryPromise()])' },
		{ code: 'Promise.all()' },
		{ code: 'Promise.all([1, , , 3, ])' },
		// allSettled
		{ code: 'Promise.allSettled(["value", new Promise(() => {})])' },
		{ code: 'ImmediatePromise.allSettled([immediatePromise])' },
		{ code: 'Promise.allSettled([immediatePromise.getOrdinaryPromise()])' },
		{ code: 'Promise.allSettled([])' },
		{ code: 'Promise.allSettled()' },
		// race
		{ code: 'Promise.race(["value", new Promise(() => {})])' },
		{ code: 'ImmediatePromise.race([immediatePromise])' },
		{ code: 'Promise.race([immediatePromise.getOrdinaryPromise()])' },
		{ code: 'Promise.race([])' },
		{ code: 'Promise.race()' },
		// any
		{ code: 'Promise.any(["value", new Promise(() => {})])' },
		{ code: 'ImmediatePromise.any([immediatePromise])' },
		{ code: 'Promise.any([immediatePromise.getOrdinaryPromise()])' },
		{ code: 'Promise.any([])' },
		{ code: 'Promise.any()' },
	].map(prefixImmediatePromiseDeclaration),
	invalid: ([
		// resolve
		{
			code: 'Promise.resolve(immediatePromise)',
			output: 'immediatePromise.getOrdinaryPromise()',
			errors: [{ messageId: 'useGetOrdinaryPromise' }],
		},
		{
			code: 'Promise.resolve(immediatePromise as ImmediatePromise<number> | A)',
			errors: [{ messageId: 'useGetOrdinaryPromise' }],
		},
		{
			code: 'Promise.resolve(immediatePromise as ImmediatePromise<number>)',
			output: '(immediatePromise as ImmediatePromise<number>).getOrdinaryPromise()',
			errors: [{ messageId: 'useGetOrdinaryPromise' }],
		},
		{
			code: 'Promise.resolve(immediatePromise as ImmediatePromise<number>)',
			output: '(immediatePromise as ImmediatePromise<number>).getOrdinaryPromise()',
			errors: [{ messageId: 'useGetOrdinaryPromise' }],
		},
		{
			code: 'Promise.resolve(immediatePromise as ImmediatePromise<number> & A)',
			output: '(immediatePromise as ImmediatePromise<number> & A).getOrdinaryPromise()',
			errors: [{ messageId: 'useGetOrdinaryPromise' }],
		},
		// all
		{
			code: 'Promise.all([immediatePromise])',
			output: 'ImmediatePromise.all([immediatePromise])',
			errors: [{ messageId: 'useImmediatePromiseVersion', data: { methodName: 'all' } }],
		},
		{
			code: 'Promise.all(["value", immediatePromise])',
			output: 'ImmediatePromise.all(["value", immediatePromise])',
			errors: [{ messageId: 'useImmediatePromiseVersion', data: { methodName: 'all' } }],
		},
		{
			code: 'Promise.all([immediatePromise, immediatePromise])',
			output: 'ImmediatePromise.all([immediatePromise, immediatePromise])',
			errors: [{ messageId: 'useImmediatePromiseVersion', data: { methodName: 'all' } }],
		},
		// allSettled
		{
			code: 'Promise.allSettled([immediatePromise])',
			output: 'ImmediatePromise.allSettled([immediatePromise])',
			errors: [{ messageId: 'useImmediatePromiseVersion', data: { methodName: 'allSettled' } }],
		},
		{
			code: 'Promise.allSettled(["value", immediatePromise])',
			output: 'ImmediatePromise.allSettled(["value", immediatePromise])',
			errors: [{ messageId: 'useImmediatePromiseVersion', data: { methodName: 'allSettled' } }],
		},
		{
			code: 'Promise.allSettled([immediatePromise, immediatePromise])',
			output: 'ImmediatePromise.allSettled([immediatePromise, immediatePromise])',
			errors: [{ messageId: 'useImmediatePromiseVersion', data: { methodName: 'allSettled' } }],
		},
		// race
		{
			code: 'Promise.race([immediatePromise])',
			output: 'ImmediatePromise.race([immediatePromise])',
			errors: [{ messageId: 'useImmediatePromiseVersion', data: { methodName: 'race' } }],
		},
		{
			code: 'Promise.race(["value", immediatePromise])',
			output: 'ImmediatePromise.race(["value", immediatePromise])',
			errors: [{ messageId: 'useImmediatePromiseVersion', data: { methodName: 'race' } }],
		},
		{
			code: 'Promise.race([immediatePromise, immediatePromise])',
			output: 'ImmediatePromise.race([immediatePromise, immediatePromise])',
			errors: [{ messageId: 'useImmediatePromiseVersion', data: { methodName: 'race' } }],
		},
		// any
		{
			code: 'Promise.any([immediatePromise])',
			output: 'ImmediatePromise.any([immediatePromise])',
			errors: [{ messageId: 'useImmediatePromiseVersion', data: { methodName: 'any' } }],
		},
		{
			code: 'Promise.any(["value", immediatePromise])',
			output: 'ImmediatePromise.any(["value", immediatePromise])',
			errors: [{ messageId: 'useImmediatePromiseVersion', data: { methodName: 'any' } }],
		},
		{
			code: 'Promise.any([immediatePromise, immediatePromise])',
			output: 'ImmediatePromise.any([immediatePromise, immediatePromise])',
			errors: [{ messageId: 'useImmediatePromiseVersion', data: { methodName: 'any' } }],
		},
	] as const).map(prefixImmediatePromiseDeclaration),
});
