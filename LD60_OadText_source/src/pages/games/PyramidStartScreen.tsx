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
				<pixiSprite
					texture={$PyramidCover.getTile(0, 0)}
					scale={{ x: CELL_WIDTH / 2, y: CELL_HEIGHT / 3 }}
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
