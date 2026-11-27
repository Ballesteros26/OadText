import $EuropeanTeletext from 'assets/fonts/EuropeanTeletext.ttf';
import Page from '../Page';
import type Teletext from 'src/Teletext';
import { CELL_HEIGHT, CELL_WIDTH, HEIGHT, WIDTH } from 'src/Teletext';
import { component } from 'engine/View/Decorators';
import once from 'engine/Events/once';
import $PyramidCover from './PyramidCover.aseprite';

export default class PyramidDescription extends Page {
	constructor(private teletext: Teletext) {
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
					this.teletext.setPage(x => x + 1);
					break;
				case 'BLUE':
					this.teletext.setPage(110);
					break;
			}
		}
	}

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
						fill: 0xFFFFFF,
						fontFamily: $EuropeanTeletext,
						fontSize: 32,
					}}
					text={`Pyramid Builder Game

Educational game: Have you ever
wondered how the pyramids were
built?

In this game you can learn about
the old technologies they have used`}
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
		return 'Start';
	}
	getBlueLabel(): string {
		return 'Index';
	}
}
