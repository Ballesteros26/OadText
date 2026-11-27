import rule from '../../../../lib/rules/View/use-component-decorator.ts';
import { getRuleTester } from '../../utils.ts';

const ruleTester = getRuleTester();

ruleTester.run('use-component-decorator', rule, {
	valid: [
		{
			code: `class A {
	public view() { }
}`,
		},
		{
			code: `class A {
	public View(): void
}`,
		},
		{
			code: `class A {
	@component()
	public View() { }
}`,
		},
		{
			code: `class A {
	@component({})
	public View() { }
}`,
		},
		{
			code: `class A {
	@component()
	public View(props: {x: number}) { }
}`,
		},
		{
			code: `class A {
	@component({
		shouldUpdate: () => true,
	})
	public View(props: {x: number, ref: any}) { }
}`,
		},
	],
	invalid: [
		{
			code: `class A {
	public View() { }
}`,
			output: `class A {
	@component()
public View() { }
}`,
			errors: [{ messageId: 'useComponentDecorator' }],
		},
		{
			code: `class A {
	public View(props: {x: number}) { }
}`,
			output: `class A {
	@component()
public View(props: {x: number}) { }
}`,
			errors: [{ messageId: 'useComponentDecorator' }],
		},
	],
});
