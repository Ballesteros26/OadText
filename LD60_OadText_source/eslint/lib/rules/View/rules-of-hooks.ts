import { type Rule } from 'eslint';
import { rules } from 'eslint-plugin-react-hooks';

const originalRuleOfHooks = rules['rules-of-hooks'];

type Node = Rule.Node;

function mimicObjectLiteralProperty(node: Node): Node | undefined {
	if (node.type === 'FunctionExpression' && node.id == null) {
		if (node.parent.type === 'MethodDefinition') {
			const altered = Object.create(node);
			altered.id = node.parent.key;
			return altered;
		}
	}
	if (node.type === 'ArrowFunctionExpression' || node.type === 'FunctionExpression') {
		if (node.parent.type === 'PropertyDefinition') {
			const altered = Object.create(node);
			altered.id = null;
			altered.parent = Object.create(node.parent);
			altered.parent.type = 'Property';
			altered.parent.value = altered;
			return altered;
		}
	}
}

/**
 * Extends react-hooks/rules-of-hooks rule to allow calling hooks inside of
 * class methods.
 */
export default {
	...originalRuleOfHooks,
	create(context) {
		const visitor = originalRuleOfHooks.create(context);
		const alteredNodes = new WeakMap<Node, Node>();
		return {
			...visitor,
			'*'(node: Node) {
				// The original rule checks that hooks are called by function
				// components in the '*'/'*:exit' visitor. We therefore pass
				// on altered nodes for cases we want to support additionally
				const altered = mimicObjectLiteralProperty(node);
				if (altered) {
					alteredNodes.set(node, altered);
				}
				visitor['*'].call(this, altered ?? node);
			},
			'*:exit'(node: Node) {
				visitor['*:exit'].call(this, alteredNodes.get(node) ?? node);
			},
		} satisfies Rule.RuleListener;
	},
} satisfies Rule.RuleModule;
