import { AST_NODE_TYPES, ESLintUtils, type TSESTree } from '@typescript-eslint/utils';
import { returnValues, isImmediatePromise, callGetOrdinaryPromiseIfApplicable } from '../../utils.ts';

function getStaticPromiseMethodName(node: TSESTree.MemberExpression) {
	if (node.computed) {
		return null;
	}
	const object = node.object;
	if (object.type !== AST_NODE_TYPES.Identifier || object.name !== 'Promise') {
		return null;
	}
	const prop = node.property;
	if (prop.type !== AST_NODE_TYPES.Identifier) {
		return null;
	}
	return prop.name;
}

export default ESLintUtils.RuleCreator.withoutDocs({
	create(context) {
		return {
			CallExpression(node) {
				const callee = node.callee;
				if (callee.type !== AST_NODE_TYPES.MemberExpression) {
					return;
				}
				const methodName = getStaticPromiseMethodName(callee);
				if (methodName == null) {
					return;
				}
				const argument = node.arguments.at(0);
				if (!argument) {
					return;
				}
				switch (methodName) {
					case 'reject':
						break;
					case 'resolve':
						if (isImmediatePromise(context, argument) !== returnValues.no) {
							context.report({
								messageId: 'useGetOrdinaryPromise',
								node,
								fix(fixer) {
									const fixedCode = callGetOrdinaryPromiseIfApplicable(context, argument);
									if (fixedCode == null) {
										return null;
									}
									return fixer.replaceText(node, fixedCode);
								},
							});
						}
						break;
					case 'all':
					case 'allSettled':
					case 'race':
					case 'any':
						if (
							argument.type === AST_NODE_TYPES.ArrayExpression &&
							argument.elements.some(e => e != null && isImmediatePromise(context, e) !== returnValues.no)
						) {
							context.report({
								messageId: 'useImmediatePromiseVersion',
								data: {
									methodName,
								},
								node,
								fix(fixer) {
									const promiseObject = callee.object;
									return fixer.replaceText(promiseObject, 'ImmediatePromise');
								},
							});
						}
				}
			},
		};
	},
	name: 'no-promise-methods-on-immediate',
	meta: {
		docs: {
			description: 'disallow using static Promise methods on ImmediatePromises.',
			recommended: 'error',
		},
		messages: {
			useGetOrdinaryPromise: 'Use `.getOrdinaryPromise()` to turn an ImmediatePromise into a Promise',
			useImmediatePromiseVersion: 'Use `ImmediatePromise.{{ methodName }}` instead of `Promise.{{ methodName }}`',
		},
		type: 'problem',
		schema: [],
		fixable: 'code',
	},
});
