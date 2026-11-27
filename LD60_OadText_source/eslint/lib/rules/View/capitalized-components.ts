import { AST_NODE_TYPES, ESLintUtils } from '@typescript-eslint/utils';
import { isValidVariableName, isCapitalized } from './utils.ts';

export default ESLintUtils.RuleCreator.withoutDocs({
	create(context) {
		return {
			JSXOpeningElement(node) {
				if (node.name.type !== AST_NODE_TYPES.JSXMemberExpression) {
					return;
				}
				const name = node.name.property.name;
				if (isValidVariableName.test(name) && !isCapitalized.test(name)) {
					context.report({
						messageId: 'capitalizeComponent',
						node: node.name.property,
					});
				}
			},
		};
	},
	name: 'capitalized-components',
	meta: {
		docs: {
			description: 'Components should be capitalized.',
			recommended: 'error',
		},
		messages: {
			capitalizeComponent: 'Capitalize the name of this component',
		},
		type: 'problem',
		schema: [],
	},
});
