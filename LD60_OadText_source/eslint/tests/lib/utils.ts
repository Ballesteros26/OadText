import { RuleTester, type InvalidTestCase, type ValidTestCase } from '@typescript-eslint/rule-tester';

export function getRuleTester() {
	return new RuleTester({
		languageOptions: {
			parserOptions: {
				project: './tsconfig.json',
				tsconfigRootDir: new URL('../fixtures', import.meta.url).pathname,
				ecmaFeatures: {
					jsx: true,
				},
			},
		},
	});
}

// align code with vitest indentation
function fixIndentation(string: string) {
	return string
		.split('\n')
		.map((line, i) => `${' '.repeat(i && 9)}${line}`)
		.join('\n')
		.replaceAll('\t', ' '.repeat(4));
}

function prefixCode(prefix: string, code: string) {
	return fixIndentation(`${prefix}\n\n${code}`) + '\n\n';
}

function prefixOutput(prefix: string, output: string | string[]) {
	return Array.isArray(output)
		? output.map(code => prefixCode(prefix, code))
		: prefixCode(prefix, output);
}

export const prefixTestCase =
	(prefix: string) => <T extends ValidTestCase<any> | InvalidTestCase<string, any>>(testCase: T): T => ({
		...testCase,
		code: prefixCode(prefix, testCase.code),
		output: 'output' in testCase && testCase.output != null
			? prefixOutput(prefix, testCase.output)
			: undefined,
		errors: 'errors' in testCase && testCase.errors != null
			? testCase.errors.map(err => ({
				...err,
				suggestions: err.suggestions?.map(suggestion => ({
					...suggestion,
					output: suggestion.output
						? prefixOutput(prefix, suggestion.output)
						: undefined,
				})),
			}))
			: undefined,
	});
