import $EuropeanTeletext from 'assets/fonts/EuropeanTeletext.ttf';
import Page from '../Page';
import type Teletext from 'src/Teletext';
import { CELL_HEIGHT, CELL_WIDTH } from 'src/Teletext';
import { component } from 'engine/View/Decorators';
import once from 'engine/Events/once';

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
				<pixiBitmapText
					x={CELL_WIDTH}
					y={CELL_HEIGHT}
					style={{
						fill: 0xff0000,
						fontFamily: $EuropeanTeletext,
						fontSize: 32,
					}}
					text={`


						






 You can't cancel your subscription.`}
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
