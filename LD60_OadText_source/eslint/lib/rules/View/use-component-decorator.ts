import { AST_NODE_TYPES, ESLintUtils } from '@typescript-eslint/utils';
import { isValidVariableName, isCapitalized } from './utils.ts';

const componentName = 'component';

export default ESLintUtils.RuleCreator.withoutDocs({
	create(context) {
		return {
			MethodDefinition(node) {
				const nameNode = node.key;
				if (nameNode.type !== AST_NODE_TYPES.Identifier) {
					return;
				}
				const name = nameNode.name;
				if (!isValidVariableName.test(name) || !isCapitalized.test(name)) {
					return;
				}

				if (node.value.type !== AST_NODE_TYPES.FunctionExpression) {
					return;
				}

				const decorator = node.decorators
					.map(d => d.expression)
					.filter(d => d.type === AST_NODE_TYPES.CallExpression)
					.find(d =>
						d.callee.type === AST_NODE_TYPES.Identifier &&
						d.callee.name === componentName
					);

				if (decorator != null) {
					return;
				}

				context.report({
					messageId: 'useComponentDecorator',
					node: nameNode,
					fix(fixer) {
						return fixer.insertTextBefore(node, `@${componentName}()\n`);
					},
				});
			},
		};
	},
	name: 'use-component-decorator',
	meta: {
		docs: {
			description: 'Use component decorator for react components',
			recommended: 'error',
		},
		messages: {
			useComponentDecorator: `Annotate with \`@${componentName}\``,
		},
		type: 'problem',
		schema: [],
		fixable: 'code',
	},
});
