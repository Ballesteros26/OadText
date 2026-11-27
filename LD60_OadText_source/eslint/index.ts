import rule1 from './lib/rules/ImmediatePromise/no-promise-methods-on-immediate.ts';
import rule2 from './lib/rules/ImmediatePromise/handle-immediate-promise-synchronously.ts';
import rule3 from './lib/rules/ImmediatePromise/call-getOrdinaryPromise-on-return.ts';
import rule4 from './lib/rules/custom-async-runtime/no-async-generator-functions.ts';
import rule5 from './lib/rules/custom-async-runtime/no-await-using.ts';
import rule6 from './lib/rules/Process/no-direct-process-creation.ts';
import rule7 from './lib/rules/View/capitalized-components.ts';
import rule8 from './lib/rules/View/rules-of-hooks.ts';
import rule9 from './lib/rules/View/set-eventMode.ts';
import rule10 from './lib/rules/View/use-component-decorator.ts';
import rule11 from './lib/rules/View/use-jsx-syntax.ts';

const projectName = 'quack-engine';

const rules = {
	'no-promise-methods-on-immediate': rule1,
	'handle-immediate-promise-synchronously': rule2,
	'call-getOrdinaryPromise-on-return': rule3,
	'no-async-generator-functions': rule4,
	'no-await-using': rule5,
	'no-direct-process-creation': rule6,
	'capitalized-components': rule7,
	'rules-of-hooks': rule8,
	'set-eventMode': rule9,
	'use-component-decorator': rule10,
	'use-jsx-syntax': rule11,
};

const plugin = {
	meta: {
		name: 'eslint-plugin-quack-engine',
	},
	configs: {
		recommended: {},
	},
	rules,
};

plugin.configs.recommended = {
	plugins: {
		[projectName]: plugin,
	},
	rules: {
		[`${projectName}/no-promise-methods-on-immediate`]: ['error'],
		[`${projectName}/handle-immediate-promise-synchronously`]: ['error'],
		[`${projectName}/call-getOrdinaryPromise-on-return`]: ['warn'],
		[`${projectName}/no-async-generator-functions`]: ['error'],
		[`${projectName}/no-await-using`]: ['error'],
		[`${projectName}/no-direct-process-creation`]: ['error'],
		[`${projectName}/capitalized-components`]: ['error'],
		[`${projectName}/rules-of-hooks`]: ['error'],
		[`${projectName}/set-eventMode`]: ['warn'],
		[`${projectName}/use-component-decorator`]: ['error'],
		[`${projectName}/use-jsx-syntax`]: ['error'],
	},
};

export default plugin;
