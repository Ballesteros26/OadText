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
				case 'YELLOW':
					this.teletext.remote.send('blue-buttons');
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
						fill: 0xffffff,
						fontFamily: $EuropeanTeletext,
						fontSize: 32,
					}}
					text={`



Still having last years remote with
white buttons? Pathetic!

Buy the ultimate remote update here!!!`}
				/>
			</>
		);
	}
	getRedLabel(): string {
		return 'Next';
	}
	getGreenLabel(): string {
		return 'P-';
	}
	getYellowLabel(): string {
		return 'BUY NOW!!!';
	}
	getBlueLabel(): string {
		return 'Index';
	}
}
