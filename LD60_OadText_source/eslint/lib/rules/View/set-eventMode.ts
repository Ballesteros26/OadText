import { AST_NODE_TYPES, ESLintUtils, type TSESTree } from '@typescript-eslint/utils';
import { isCapitalized } from './utils.ts';

// TODO add fixer

export default ESLintUtils.RuleCreator.withoutDocs({
	create(context) {
		return {
			JSXOpeningElement(node) {
				if (node.name.type === AST_NODE_TYPES.JSXIdentifier && !isCapitalized.test(node.name.name)) {
					// tag is html element
					return;
				}

				const eventModeRequiredProps: TSESTree.JSXAttribute[] = [];
				let eventModeProp: TSESTree.JSXAttribute | null = null;
				let isSpreadUsed = false;
				for (const attribute of node.attributes) {
					if (
						attribute.type === AST_NODE_TYPES.JSXAttribute &&
						attribute.name.type === AST_NODE_TYPES.JSXIdentifier
					) {
						const name = attribute.name.name;
						if (name === 'eventMode') {
							eventModeProp = attribute;
							continue;
						}
						if (name === 'ref') {
							eventModeRequiredProps.push(attribute);
						}
						if (name.startsWith('on')) {
							eventModeRequiredProps.push(attribute);
						}
					} else {
						isSpreadUsed = true;
					}
				}
				if (eventModeProp == null) {
					eventModeRequiredProps.forEach(node => {
						context.report({
							messageId: 'setEventMode',
							node,
						});
					});
				} else if (!isSpreadUsed && eventModeRequiredProps.length === 0) {
					const value = eventModeProp.value;
					const content = value?.type === AST_NODE_TYPES.Literal ? value.value : undefined;
					if ((['static', 'dynamic'] as unknown[]).includes(content)) {
						context.report({
							messageId: 'removeEventMode',
							node: eventModeProp,
						});
					}
				}
			},
		};
	},
	name: 'set-eventMode',
	meta: {
		docs: {
			description: 'Set eventMode explicitly if component has event listeners or refs',
			recommended: 'warn',
		},
		messages: {
			setEventMode: 'Set eventMode attribute to true',
			removeEventMode: 'Remove the attribute eventMode',
		},
		type: 'problem',
		schema: [],
	},
});
