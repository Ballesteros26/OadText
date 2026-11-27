import { ESLintUtils } from '@typescript-eslint/utils';
import { isInAsyncFunction } from '../../utils.ts';

export default ESLintUtils.RuleCreator.withoutDocs({
	create(context) {
		return {
			'VariableDeclaration'(node) {
				if (node.kind === 'await using' && isInAsyncFunction(node)) {
					context.report({
						messageId: 'awaitUsingIsNotSupported',
						node,
					});
				}
			},
		};
	},
	name: 'no-await-using',
	meta: {
		docs: {
			description: 'Await using declarations are not supported',
			recommended: 'error',
		},
		messages: {
			awaitUsingIsNotSupported: 'Remove this await using declaration.',
		},
		type: 'problem',
		schema: [],
	},
});
