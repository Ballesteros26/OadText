import rule from '../../../../lib/rules/View/use-jsx-syntax.ts';
import { getRuleTester, prefixTestCase } from '../../utils.ts';

const ruleTester = getRuleTester();

const prefixProcessDeclaration = prefixTestCase(`function Component() {}
function component() {}

const obj = {
	Component: function() {},
	component: function() {},
	Sub: {
		Component: function() {},
		component: function() {},
	}
}`);

ruleTester.run('use-jsx-syntax', rule, {
	valid: [
		{ code: 'component()' },
		{ code: 'obj.component()' },
		{ code: 'obj.Sub.component()' },
		{ code: 'const a = Component' },
		{ code: 'const a = new Component()' },
		{ code: 'const a = obj.Component' },
		{ code: 'const a = new obj.Component()' },
		// ignore Symbol
		{ code: 'Symbol()' },
		{ code: 'const A = Symbol; A()' },
	].map(prefixProcessDeclaration),
	invalid: ([
		{
			code: 'Component()',
			errors: [{ messageId: 'useJsxSyntax' }],
		},
		{
			code: 'obj.Component()',
			errors: [{ messageId: 'useJsxSyntax' }],
		},
		{
			code: 'obj?.Component()',
			errors: [{ messageId: 'useJsxSyntax' }],
		},
		{
			code: 'obj.Sub.Component()',
			errors: [{ messageId: 'useJsxSyntax' }],
		},
		// Symbol can be overwritten
		{
			code: `function SymbolConstructor() {}
SymbolConstructor()`,
			errors: [{ messageId: 'useJsxSyntax' }],
		},
		{
			code: `type SymbolConstructor = {}
const Symbol: SymbolConstructor = {}
Symbol()`,
			errors: [{ messageId: 'useJsxSyntax' }],
		},
	] as const).map(prefixProcessDeclaration),
});
