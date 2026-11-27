import $EuropeanTeletext from 'assets/fonts/EuropeanTeletext.ttf';
import Page from '../Page';
import type Teletext from 'src/Teletext';
import { CELL_HEIGHT, CELL_WIDTH } from 'src/Teletext';
import { component } from 'engine/View/Decorators';
import once from 'engine/Events/once';
import $Titles from '../games/Titles.aseprite';

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
					break;
				case 'BLUE':
					this.teletext.setPage(110);
					break;
			}
		}
	}
	private text!: string;

	async initialize() {
	}

	@component()
	View() {
		return (
			<>
				<pixiSprite
					texture={$Titles.getTile(2, 0)}
					scale={{ x: CELL_WIDTH / 2, y: CELL_HEIGHT / 3 }}
				/>
				<pixiBitmapText
					style={{
						fill: 0xffffff,
						fontFamily: $EuropeanTeletext,
						fontSize: 32,
					}}
					text={`








 Remote Updates ................... 810

 Sound Effects .................... 820
`}
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
		return '';
	}
	getBlueLabel(): string {
		return 'Index';
	}
}
