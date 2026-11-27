import { AST_NODE_TYPES, ESLintUtils, type TSESTree } from '@typescript-eslint/utils';
import {
	isInAsyncFunction,
	returnValues,
	isImmediatePromise,
	callGetOrdinaryPromiseIfApplicable,
} from '../../utils.ts';

function travelToOuterValueNode<
	T extends TSESTree.Node,
>(node: T | TSESTree.Property | TSESTree.ObjectExpression | TSESTree.ArrayExpression) {
	while (node.parent) {
		switch (true) {
			case node.parent.type === AST_NODE_TYPES.Property && node.parent.value === node:
			case node.parent.type === AST_NODE_TYPES.ObjectExpression:
			case node.parent.type === AST_NODE_TYPES.ArrayExpression:
				node = node.parent;
				break;
			default:
				return node;
		}
	}
	return node;
}

export default ESLintUtils.RuleCreator.withoutDocs({
	create(context) {
		function visitor(originalNode: TSESTree.NewExpression | TSESTree.CallExpression) {
			if (isImmediatePromise(context, originalNode) === returnValues.no) {
				return;
			}
			const node = travelToOuterValueNode(originalNode);

			switch (true) {
				case node.parent.type === AST_NODE_TYPES.AssignmentExpression && node.parent.right === node:
				case node.parent.type === AST_NODE_TYPES.VariableDeclarator && node.parent.init === node:
				case node.parent.type === AST_NODE_TYPES.PropertyDefinition && node.parent.value === node:
				case node.parent.type === AST_NODE_TYPES.AwaitExpression && node.parent.argument !== originalNode:
				case node.parent.type === AST_NODE_TYPES.ReturnStatement && isInAsyncFunction(node.parent) &&
					node.parent.argument !== originalNode:
					context.report({
						messageId: 'handleImmediatePromise',
						node: originalNode,
						suggest: [{
							messageId: 'useGetOrdinaryPromise',
							fix(fixer) {
								const fixedCode = callGetOrdinaryPromiseIfApplicable(context, originalNode);
								if (fixedCode == null) {
									return null;
								}
								return fixer.replaceText(originalNode, fixedCode);
							},
						}],
					});
			}
		}

		return {
			'NewExpression': visitor,
			'CallExpression': visitor,
		};
	},
	name: 'handle-immediate-promise-synchronously',
	meta: {
		docs: {
			description: 'handle Immediate Promises synchronously.',
			recommended: 'warn',
		},
		messages: {
			handleImmediatePromise: 'Handle ImmediatePromise synchronously',
			useGetOrdinaryPromise: 'Use `.getOrdinaryPromise()` to turn an ImmediatePromise into a Promise',
		},
		type: 'suggestion',
		schema: [],
		hasSuggestions: true,
	},
});
