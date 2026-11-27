import rule from '../../../../lib/rules/View/rules-of-hooks.ts';
import { getRuleTester } from '../../utils';

const ruleTester = getRuleTester();

const validCode = `
const [value, setValue] = useState(0);
`;

const conditionalHookCall = `
if (Math.random() < 0.5) {${validCode}}
`;

ruleTester.run('rules-of-hooks', rule, {
	valid: [
		{
			code: `function Component() {${validCode}}`,
		},
		{
			code: `function useCustomHook() {${validCode}}`,
		},
		// extended cases
		{
			code: `class Process {
	View() {${validCode}}
}`,
		},
		{
			code: `class Process {
	View = () => {${validCode}}
}`,
		},
		{
			code: `class Process {
	View = function () {${validCode}}
}`,
		},
		{
			code: `class Process {
	View = function view() {${validCode}}
}`,
		},
	],
	invalid: [
		{
			code: validCode,
			errors: [{ message: /React Hook "useState" cannot be called at the top level\./ }],
		},
		{
			code: `function notAHook() {${validCode}}`,
			errors: [{ message: /React Hook "useState" is called in function "notAHook" that is neither/ }],
		},
		// conditionally called hooks
		{
			code: `function Component() {${conditionalHookCall}}`,
			errors: [{ message: /React Hook "useState" is called conditionally\./ }],
		},
		{
			code: `class Process {
	View() {${conditionalHookCall}}
}`,
			errors: [{ message: /React Hook "useState" is called conditionally\./ }],
		},
		{
			code: `class Process {
	View = () => {${conditionalHookCall}}
}`,
			errors: [{ message: /React Hook "useState" is called conditionally\./ }],
		},
		{
			code: `class Process {
	View = function () {${conditionalHookCall}}
}`,
			errors: [{ message: /React Hook "useState" is called conditionally\./ }],
		},
		// invalid method name
		{
			code: `class Process {
	view() {${validCode}}
}`,
			errors: [{ message: /React component names must start with an uppercase letter\./ }],
		},
		{
			code: `class Process {
	view = () => {${validCode}}
}`,
			errors: [{ message: /React component names must start with an uppercase letter\./ }],
		},
		{
			code: `class Process {
	view = function () {${validCode}}
}`,
			errors: [{ message: /React component names must start with an uppercase letter\./ }],
		},
		{
			code: `class Process {
	view = function View() {${validCode}}
}`,
			errors: [{ message: /React component names must start with an uppercase letter\./ }],
		},
		// async methods
		{
			code: `class Process {
	async View() {${validCode}}
}`,
			errors: [{ message: /React Hook "useState" cannot be called in an async function\./ }],
		},
		{
			code: `class Process {
	View = async () => {${validCode}}
}`,
			errors: [{ message: /React Hook "useState" cannot be called in an async function\./ }],
		},
		{
			code: `class Process {
	View = async function () {${validCode}}
}`,
			errors: [{ message: /React Hook "useState" cannot be called in an async function\./ }],
		},
		{
			code: `class Process {
	View = async function view() {${validCode}}
}`,
			errors: [{ message: /React Hook "useState" cannot be called in an async function\./ }],
		},
	],
});
