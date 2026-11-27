import { AST_NODE_TYPES, ESLintUtils, type TSESTree } from '@typescript-eslint/utils';
import { isValidVariableName, isCapitalized } from './utils.ts';
import type { Context } from '../../utils.ts';

function isSymbol(context: Context, node: TSESTree.Node) {
	const parserServices = ESLintUtils.getParserServices(context);
	const checker = parserServices.program.getTypeChecker();

	const nodeType = checker.getApparentType(parserServices.getTypeAtLocation(node));

	// TODO this might not be 100% correct
	return checker.getFullyQualifiedName(nodeType.symbol) === 'SymbolConstructor' &&
		nodeType.symbol.valueDeclaration == null;
}

export default ESLintUtils.RuleCreator.withoutDocs({
	create(context) {
		return {
			CallExpression(node) {
				let identifier: TSESTree.Expression | TSESTree.PrivateIdentifier = node.callee;
				while (identifier.type === AST_NODE_TYPES.MemberExpression) {
					identifier = identifier.property;
				}
				if (
					identifier.type === AST_NODE_TYPES.Identifier &&
					isValidVariableName.test(identifier.name)
					&& isCapitalized.test(identifier.name)
					&& !isSymbol(context, identifier)
				) {
					context.report({
						node,
						messageId: 'useJsxSyntax',
					});
				}
			},
		};
	},
	name: 'use-jsx-syntax',
	meta: {
		docs: {
			description: 'Components should be called with JSX syntax.',
			recommended: 'error',
		},
		messages: {
			useJsxSyntax: 'Call this component with JSX syntax',
		},
		type: 'problem',
		schema: [],
	},
});
