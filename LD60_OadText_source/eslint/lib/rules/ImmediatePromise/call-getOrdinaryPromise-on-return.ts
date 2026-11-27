import { AST_NODE_TYPES, ESLintUtils, type TSESTree } from '@typescript-eslint/utils';
import {
	isInAsyncFunction,
	returnValues,
	isImmediatePromise,
	callGetOrdinaryPromiseIfApplicable,
} from '../../utils.ts';

function travelToOuterAwait<T extends TSESTree.Node>(node: T | TSESTree.AwaitExpression) {
	while (node.parent?.type === AST_NODE_TYPES.AwaitExpression) {
		node = node.parent;
	}
	return node;
}

export default ESLintUtils.RuleCreator.withoutDocs({
	create(context) {
		function visitor(originalNode: TSESTree.NewExpression | TSESTree.CallExpression | TSESTree.Identifier) {
			if (isImmediatePromise(context, originalNode) === returnValues.no) {
				return;
			}
			const node = travelToOuterAwait(originalNode);

			switch (true) {
				case node.parent.type === AST_NODE_TYPES.ReturnStatement && isInAsyncFunction(node.parent):
				case node.parent.type === AST_NODE_TYPES.ArrowFunctionExpression && node.parent.async &&
					node.parent.body === node:
					context.report({
						messageId: 'useGetOrdinaryPromise',
						node: originalNode,
						fix(fixer) { // TODO muss das zu suggestion, wenn es das wirklich gibt?
							const fixedCode = callGetOrdinaryPromiseIfApplicable(context, originalNode);
							if (fixedCode == null) {
								return null;
							}
							return fixer.replaceText(originalNode, fixedCode);
						},
					});
			}
		}

		return {
			'NewExpression': visitor,
			'CallExpression': visitor,
			'Identifier': visitor,
		};
	},
	name: 'call-getOrdinaryPromise-on-return',
	meta: {
		docs: {
			description: 'turn ImmediatePromises explicity into Promises before returning them from an async function',
			recommended: 'warn',
		},
		messages: {
			useGetOrdinaryPromise: 'Use `.getOrdinaryPromise()` to turn an ImmediatePromise into a Promise',
		},
		type: 'suggestion',
		schema: [],
		fixable: 'code',
	},
});
