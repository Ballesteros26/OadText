import rule from '../../../../lib/rules/View/capitalized-components.ts';
import { getRuleTester } from '../../utils.ts';

const ruleTester = getRuleTester();

ruleTester.run('capitalized-components', rule, {
	valid: [
		{ code: '<this.View/>' },
		{ code: '<this.View x={this.x}/>' },
		{ code: '<this.View x={this.x}></this.View>' },
		{ code: '<this.sub.View x={this.x}/>' },
		{ code: '<this.sub.View x={this.x}></this.sub.View>' },
		{ code: '<this._View x={this.x}/>' },
		{ code: '<this.$View x={this.x}/>' },
		{ code: '<p></p>' },
	],
	invalid: [
		{
			code: '<this.view x={this.x}/>',
			errors: [{ messageId: 'capitalizeComponent' }],
		},
		{
			code: '<this.viewView x={this.x}/>',
			errors: [{ messageId: 'capitalizeComponent' }],
		},
		{
			code: '<this.view x={this.x}></this.view>',
			errors: [{ messageId: 'capitalizeComponent' }],
		},
		{
			code: '<this.Sub.view x={this.x}/>',
			errors: [{ messageId: 'capitalizeComponent' }],
		},
		{
			code: '<this.Sub.view x={this.x}></this.Sub.view>',
			errors: [{ messageId: 'capitalizeComponent' }],
		},
		{
			code: '<this._view x={this.x}/>',
			errors: [{ messageId: 'capitalizeComponent' }],
		},
		{
			code: '<this.$view x={this.x}/>',
			errors: [{ messageId: 'capitalizeComponent' }],
		},
		{
			code: '<this.$ x={this.x}/>',
			errors: [{ messageId: 'capitalizeComponent' }],
		},
		{
			code: '<this._ x={this.x}/>',
			errors: [{ messageId: 'capitalizeComponent' }],
		},
	],
});
