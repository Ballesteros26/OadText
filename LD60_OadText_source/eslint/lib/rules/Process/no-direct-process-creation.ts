import { ESLintUtils, type TSESTree } from '@typescript-eslint/utils';
import type { Context } from '../../utils.ts';

function isProcess(context: Context, node: TSESTree.Node) {
	const parserServices = ESLintUtils.getParserServices(context);
	const checker = parserServices.program.getTypeChecker();

	const nodeType = checker.getApparentType(parserServices.getTypeAtLocation(node));

	return [
		nodeType.getProperty('createProcess'),
		nodeType.getProperty('getPromise'),
		nodeType.getProperty('step'),
		nodeType.getProperty('frame'),
	].every(m => m !== undefined);
}

export default ESLintUtils.RuleCreator.withoutDocs({
	create(context) {
		return {
			'NewExpression'(node) {
				if (!isProcess(context, node)) {
					return;
				}

				context.report({
					messageId: 'useCreateProcess',
					node: node,
					fix(fixer) {
						const newRange = [node.range[0], node.callee.range[0]] as const;
						if (node.arguments[0]) {
							const argumentsStartRange = [node.callee.range[1], node.arguments[0].range[0]] as const;
							return [
								fixer.replaceTextRange(newRange, 'this.createProcess('),
								fixer.replaceTextRange(argumentsStartRange, ', '),
							];
						} else {
							const endRange = [node.callee.range[1], node.range[1]] as const;
							return [
								fixer.replaceTextRange(newRange, 'this.createProcess('),
								fixer.replaceTextRange(endRange, ')'),
							];
						}
					},
				});
			},
		};
	},
	name: 'no-direct-process-creation',
	meta: {
		docs: {
			description: 'do not create processes using new keyword.',
			recommended: 'error',
		},
		messages: {
			useCreateProcess: 'Use `.createProcess()` to initiate new processes',
		},
		type: 'problem',
		schema: [],
		fixable: 'code',
	},
});
