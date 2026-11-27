import { glob } from 'glob';
import { defineConfig, includeIgnoreFile, type ConfigObject } from 'eslint/config';

import typescriptPlugin from 'typescript-eslint';
import quackPlugin from './eslint/index.ts';
import pluginReactHooks from 'eslint-plugin-react-hooks';

import tsconfig from './tsconfig.app.json' with { type: 'json' };

const unsavedFiles = ['test.ts?(x)', 'test.js?(x)'];

const tsconfigIncludeFiles = tsconfig.include.map((glob) =>
	glob.endsWith('/*')
		? `${glob}.{${typescriptPlugin.extensions.ts.join(',')}}`
		: glob
);

function overrideSeverityToWarn(config: ConfigObject[]): ConfigObject[] {
	return [
		...config,
		{
			rules: Object.fromEntries(config
				.map(c => c.rules)
				.filter(Boolean)
				.flatMap(Object.entries)
				.map(([rule, c]) => [rule, Array.isArray(c) ? c[0] : c])
				.filter(([_, severity]) => severity !== 'off')
				.map(([rule]) => [rule, 'warn'])),
		},
	];
}

export default defineConfig([
	typescriptPlugin.configs.base,
	{
		languageOptions: {
			parserOptions: {
				// default config for new, unsaved files
				projectService: {
					allowDefaultProject: unsavedFiles,
					defaultProject: './tsconfig.app.json',
				},
			},
		},
	},
	// ignore .gitignore files
	includeIgnoreFile(
		await glob('**/.gitignore', { nodir: true, absolute: true }),
		{ gitignoreResolution: true },
	),

	{
		files: [typescriptPlugin.globs.ts],
		extends: overrideSeverityToWarn(typescriptPlugin.configs.strictTypeChecked),
		rules: {
			// Avoid potential esbuild problems like type-only imports being
			// incorrectly bundled
			'@typescript-eslint/consistent-type-exports': ['error', {
				fixMixedExportsWithInlineTypeSpecifier: true,
			}],
			'@typescript-eslint/consistent-type-imports': ['error', {
				fixStyle: 'inline-type-imports',
			}],

			'prefer-const': ['warn', {
				'destructuring': 'all',
			}],
			'@typescript-eslint/ban-ts-comment': ['warn', {
				'ts-expect-error': false,
			}],
			'@typescript-eslint/no-explicit-any': 'off',
			'@typescript-eslint/no-non-null-assertion': 'off',

			'@typescript-eslint/no-confusing-void-expression': ['warn', {
				ignoreArrowShorthand: true,
			}],
			'@typescript-eslint/no-misused-promises': ['warn', {
				checksVoidReturn: false,
			}],
			'@typescript-eslint/no-unsafe-argument': 'off',
			'@typescript-eslint/no-unsafe-assignment': 'off',
			'@typescript-eslint/no-unsafe-call': 'off',
			'@typescript-eslint/no-unsafe-member-access': 'off',
			'@typescript-eslint/no-unsafe-return': 'off',

			'@typescript-eslint/no-unused-vars': ['warn', {
				argsIgnorePattern: '^_',
				destructuredArrayIgnorePattern: '^_',
				ignoreRestSiblings: true,
			}],
			'@typescript-eslint/prefer-literal-enum-member': ['warn', {
				allowBitwiseExpressions: true,
			}],
			'@typescript-eslint/prefer-promise-reject-errors': ['warn', {
				// align with default only-throw-error options
				allowThrowingAny: true,
				allowThrowingUnknown: true,
			}],
			'@typescript-eslint/restrict-plus-operands': ['warn', {
				allowAny: true,
				allowBoolean: false,
				allowNullish: false,
				allowNumberAndString: false,
				allowRegExp: false,
			}],
			'@typescript-eslint/restrict-template-expressions': ['warn', {
				// use default (non strict) options
				allowArray: true,
			}],
			'@typescript-eslint/triple-slash-reference': 'off',
			'@typescript-eslint/unified-signatures': ['warn', {
				ignoreDifferentlyNamedParameters: true,
			}],
		},
	},

	// application files
	{
		files: [...tsconfigIncludeFiles, ...unsavedFiles],
		plugins: {
			// @ts-expect-error see https://github.com/react/react/issues/36907
			'react-hooks': pluginReactHooks,
		},
		extends: [quackPlugin.configs.recommended],
		rules: {
			'@typescript-eslint/await-thenable': 'error',

			// this rule is required to ensure correct behavior when cancelling
			// an async function
			'no-return-await': 'off',
			'@typescript-eslint/return-await': ['error', 'always'],

			// promise rejections are handled globally
			'@typescript-eslint/no-floating-promises': 'off',
			// does not work with @Component decorator
			'@typescript-eslint/unbound-method': 'off',

			'react-hooks/exhaustive-deps': 'warn',
		},
	},

	// disable rules that could be annoying while coding
	{
		files: [`src/${typescriptPlugin.globs.jsts}`, ...unsavedFiles],
		rules: {
			'no-var': 'off',
			'prefer-const': 'off',
			'@typescript-eslint/no-extraneous-class': 'off',
			'@typescript-eslint/no-unused-vars': 'off',
			'@typescript-eslint/no-useless-constructor': 'off',
			'@typescript-eslint/require-await': 'off',
			'@typescript-eslint/unified-signatures': 'off',
		},
	},
]);
