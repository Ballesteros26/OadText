import { ESLintUtils, type TSESTree } from '@typescript-eslint/utils';

export default ESLintUtils.RuleCreator.withoutDocs({
	create(context) {
		function visitor(node: TSESTree.FunctionDeclaration | TSESTree.FunctionExpression) {
			if (node.async && node.generator) {
				context.report({
					messageId: 'asyncGereratorFunctionsAreNotSupported',
					node,
				});
			}
		}

		return {
			'FunctionDeclaration': visitor,
			'FunctionExpression': visitor,
		};
	},
	name: 'no-async-generator-functions',
	meta: {
		docs: {
			description: 'Async generator functions are not supported.',
			recommended: 'error',
		},
		messages: {
			asyncGereratorFunctionsAreNotSupported: 'Remove this async generator function.',
		},
		type: 'problem',
		schema: [],
	},
});
