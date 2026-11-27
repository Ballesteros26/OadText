import rule from '../../../../lib/rules/View/set-eventMode.ts';
import { getRuleTester, prefixTestCase } from '../../utils.ts';

const ruleTester = getRuleTester();

const prefixProcessDeclaration = prefixTestCase(`import { Container, Sprite, Text } from '@pixi/react';
import * as PixiReact from '@pixi/react';
import { EventMode } from 'pixi.ts';

function Interactive(props: {eventMode: EventMode}) {}
function NotInteractive(props: {}) {}
function StringInteractive(props: {eventMode: string}) {}`);

ruleTester.run('set-eventMode', rule, {
	valid: [
		{ code: '<h1 ref={ref}/>' },
		{ code: '<h1 onclick={() => {}}/>' },
		// TODO use type of component
		// { code: '<NotInteractive ref={ref}/>' },
		// { code: '<NotInteractive onclick={() => {}}/>' },
		// { code: '<StringInteractive ref={ref}/>' },
		// { code: '<StringInteractive onclick={() => {}}/>' },
		{ code: '<Container ref={ref} eventMode="static" />' },
		{ code: '<Container ref={ref} eventMode="dynamic" />' },
		{ code: '<Container ref={ref} eventMode={"static"} />' },
		{ code: '<Container ref={ref} eventMode={Math.random() < 0.5 ? "static" : "auto"} />' },
		{ code: '<Container x={5} />' },
		// allow eventMode to be set to false explicitly
		{ code: '<Container eventMode="none" />' },
		{ code: '<Container eventMode="passive" />' },
		{ code: '<Container eventMode="auto" />' },
		{ code: '<Container eventMode={Math.random() < 0.5 ? "static" : "auto"} />' },
		// let TypeScript handle invalid values
		{ code: '<Container ref={ref} eventMode />' },
		{ code: '<Container ref={ref} eventMode="blabla" />' },
		// set eventMode when using a spread
		{ code: '<Container eventMode {...props}><Sprite/></Container>' },
		{ code: '<Container eventMode={true} {...props}><Sprite/></Container>' },
	].map(prefixProcessDeclaration),
	invalid: ([
		{
			code: '<Container ref={ref}/>',
			errors: [{ messageId: 'setEventMode' }],
		},
		{
			code: '<Container onclick={() => {}}/>',
			errors: [{ messageId: 'setEventMode' }],
		},
		{
			// we currently ignore spreading
			code: '<Container onclick={() => {}} {...{eventMode: "static"}}/>',
			errors: [{ messageId: 'setEventMode' }],
		},
		{
			code: '<Container onclick={() => {}}><Sprite/></Container>',
			errors: [{ messageId: 'setEventMode' }],
		},
		{
			code: '<Container eventMode="static"><Sprite/></Container>',
			errors: [{ messageId: 'removeEventMode' }],
		},
		{
			code: '<Container eventMode="dynamic"><Sprite/></Container>',
			errors: [{ messageId: 'removeEventMode' }],
		},
		{
			code: '<PixiReact.Container ref={ref}/>',
			errors: [{ messageId: 'setEventMode' }],
		},
		{
			code: '<PixiReact.Container onclick={() => {}}/>',
			errors: [{ messageId: 'setEventMode' }],
		},
		{
			code: '<PixiReact.Container onclick={() => {}}><Sprite/></PixiReact.Container>',
			errors: [{ messageId: 'setEventMode' }],
		},
		{
			code: '<Interactive ref={ref}/>',
			errors: [{ messageId: 'setEventMode' }],
		},
		{
			code: '<Interactive onclick={() => {}}/>',
			errors: [{ messageId: 'setEventMode' }],
		},
		{
			code: '<Interactive onclick={() => {}}><Sprite/></Interactive>',
			errors: [{ messageId: 'setEventMode' }],
		},
	] as const).map(prefixProcessDeclaration),
});
