import rule from '../../../../lib/rules/Process/no-direct-process-creation';
import { getRuleTester, prefixTestCase } from '../../utils.ts';

const ruleTester = getRuleTester();

const prefixProcessDeclaration = prefixTestCase(`import Process from 'engine/Process/Process';

class A extends Process<any> {
	constructor(...args: any[]) {
		super();
	}
}`);

ruleTester.run('no-direct-process-creation', rule, {
	valid: [
		{ code: 'this.createProcess(A);' },
		{ code: 'this.createProcess(A, a);' },
		{ code: 'this.createProcess(A, a, b);' },
		{ code: 'class B {}; new B();' },
	].map(prefixProcessDeclaration),
	invalid: ([
		{
			code: 'new A();',
			output: 'this.createProcess(A);',
			errors: [{ messageId: 'useCreateProcess' }],
		},
		{
			code: 'new A(  );',
			output: 'this.createProcess(A);',
			errors: [{ messageId: 'useCreateProcess' }],
		},
		{
			code: 'new A;',
			output: 'this.createProcess(A);',
			errors: [{ messageId: 'useCreateProcess' }],
		},
		{
			code: 'new A(a);',
			output: 'this.createProcess(A, a);',
			errors: [{ messageId: 'useCreateProcess' }],
		},
		{
			code: 'new A(a, b);',
			output: 'this.createProcess(A, a, b);',
			errors: [{ messageId: 'useCreateProcess' }],
		},
		{
			code: 'new A ( a, b  )   ;',
			output: 'this.createProcess(A, a, b  )   ;',
			errors: [{ messageId: 'useCreateProcess' }],
		},
	] as const).map(prefixProcessDeclaration),
});
