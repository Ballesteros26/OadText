import { AST_NODE_TYPES, ESLintUtils, type TSESTree } from '@typescript-eslint/utils';
import type { RuleContext } from '@typescript-eslint/utils/ts-eslint';
import { type Type, type TypeChecker } from 'typescript';

function isFunctionLike(node: TSESTree.Node): node is
	| TSESTree.FunctionDeclaration
	| TSESTree.FunctionExpression
	| TSESTree.ArrowFunctionExpression
{
	return [
		AST_NODE_TYPES.FunctionDeclaration,
		AST_NODE_TYPES.FunctionExpression,
		AST_NODE_TYPES.ArrowFunctionExpression,
	].includes(node.type);
}

export function isInAsyncFunction(node: TSESTree.Node) {
	while (node.parent) {
		if (isFunctionLike(node.parent)) {
			return node.parent.async && node.parent.body === node;
		}
		node = node.parent;
	}
	return false;
}

export const returnValues = {
	no: 0,
	yes: 1,
	maybe: 2,
	maybeNull: 2,
};

export type Context = Readonly<RuleContext<string, readonly unknown[]>>;

const someType = (cb: (node: TSESTree.Node, checker: TypeChecker, ty: Type) => boolean) =>
(
	context: Context,
	node: TSESTree.Node,
) => {
	const parserServices = ESLintUtils.getParserServices(context);
	const checker = parserServices.program.getTypeChecker();

	const nodeType = checker.getApparentType(parserServices.getTypeAtLocation(node));

	if (nodeType.isUnion()) {
		return nodeType.types.some((a) => cb(node, checker, a)) ? returnValues.maybe : returnValues.no;
	}

	return cb(node, checker, nodeType) ? returnValues.yes : returnValues.no;
};

export function callGetOrdinaryPromiseIfApplicable(context: Context, node: TSESTree.Node) {
	if (isImmediatePromise(context, node) !== returnValues.yes) {
		return null;
	}
	let sourceCode = context.sourceCode.getText(node);
	if (['TSAsExpression', 'TSTypeAssertion'].includes(node.type)) {
		sourceCode = `(${sourceCode})`;
	}
	return `${sourceCode}.getOrdinaryPromise()`;
}

export const isImmediatePromise = someType((node, checker, ty) => {
	const then = ty.getProperty('getOrdinaryPromise');
	return then !== undefined;
	// if (then === undefined)
	// 	return false;
	// const thenType = checker.getTypeOfSymbolAtLocation(then, node);
	// for (const t of unionTypeParts(thenType))
	// 	for (const signature of t.getCallSignatures())
	// 		if (signature.parameters.length !== 0 && isCallback(checker, signature.parameters[0], node))
	// 			return true;
});
