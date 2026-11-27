import $EuropeanTeletext from 'assets/fonts/EuropeanTeletext.ttf';
import Page from '../Page';
import type Teletext from 'src/Teletext';
import { CELL_HEIGHT, CELL_WIDTH, HEIGHT, WIDTH } from 'src/Teletext';
import { component } from 'engine/View/Decorators';
import once from 'engine/Events/once';
import { layoutWithLines, prepareWithSegments } from '@chenglou/pretext';

export default class News extends Page {
	constructor(private teletext: Teletext, private sub: number) {
		super();

		this.registerColorButton();
	}

	async registerColorButton() {
		while (true) {
			const { value: c } = await once(this.teletext.remote, 'color');

			switch (c) {
				case 'RED':
					this.teletext.setPage(x => x + 1);
					break;
				case 'GREEN':
					this.teletext.setPage(x => x == 100 ? 999 : x - 1);
			}
		}
	}
	private text!: string;

	async initialize() {
		// TODO
		const e = await fetch('https://api.ldjam.com/vx/node/feed/1/all/post');
		const feed = (await e.json() as any).feed;

		const riodh =
			await fetch(`https://api.ldjam.com/vx/node2/get/${
				feed.map(p => p.id).join('+')
			}?author&parent&superparent`);

		const nodes = (await riodh.json() as any).node;

		console.log(feed);
		const posts = feed.map(f => nodes.find(n => n.id == f.id));
		console.log(posts);

		const string = posts.map(p =>
			`${p.name} - by ${nodes.find(n => n.id === p.author)?.name}

${p.body.replaceAll(/\!?(\[.+\]\(.+\))/g, '[image]')}`
		)[this.sub];

		const lines = string.split('\n')
			.flatMap(line => {
				if (line == '') return [''];
				const prepared = prepareWithSegments(line, `32px "${$EuropeanTeletext}"`);
				const { lines } = layoutWithLines(prepared, (WIDTH - 2) * CELL_WIDTH, CELL_HEIGHT);
				return lines.map(l => l.text);
			});

		const lineNumber = HEIGHT - 2 - 2;
		const subSub = 0;
		this.text = lines.slice(subSub * lineNumber, (subSub + 1) * lineNumber).join('\n');
	}

	@component()
	View() {
		return (
			<>
				<pixiBitmapText
					x={CELL_WIDTH}
					y={CELL_HEIGHT}
					style={{
						fill: 0xffffff,
						fontFamily: $EuropeanTeletext,
						fontSize: 32,
					}}
					text={this.text}
				/>
			</>
		);
	}
	getRedLabel(): string {
		return 'P+';
	}
	getGreenLabel(): string {
		return 'P-';
	}
	getYellowLabel(): string {
		return 'TODO';
	}
	getBlueLabel(): string {
		return 'TODO';
	}
}
