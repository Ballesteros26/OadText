import $EuropeanTeletext from 'assets/fonts/EuropeanTeletext.ttf';
import Page from '../Page';
import type Teletext from 'src/Teletext';
import { CELL_HEIGHT, CELL_WIDTH, HEIGHT, WIDTH } from 'src/Teletext';
import { component } from 'engine/View/Decorators';
import once from 'engine/Events/once';
import $connected from './connected.aseprite';

let init: number | null = null;
const HELP_COOLDOWN = 10 * 1000;

export default class Connect extends Page {
	constructor(private teletext: Teletext) {
		super();

		this.registerColorButton();
	}

	async registerColorButton() {
		while (true) {
			const { value: c } = await once(this.teletext.remote, 'color');

			switch (c) {
				// case 'RED':
				// 	this.teletext.setPage(x => x + 1);
				// 	break;
				// case 'GREEN':
				// 	this.teletext.setPage(x => x == 100 ? 999 : x - 1);
				// 	break;
				case 'BLUE':
					if (init && Date.now() - init > HELP_COOLDOWN) {
						this.teletext.setPage(101);
					}
					break;
			}
		}
	}

	async initialize() {
		if (init == null) {
			init = Date.now();
		}
	}

	@component()
	View() {
		return (
			<>
				{this.teletext.remote.connected &&
					(
						<pixiSprite
							texture={$connected.getTile(0, 0)}
							scale={{ x: CELL_WIDTH / 2, y: CELL_HEIGHT / 3 }}
						/>
					)}
				{!this.teletext.remote.connected && this.teletext.remote.texture && (
					<pixiSprite
						texture={this.teletext.remote.texture}
						// x={CELL_WIDTH * 2}
						// y={CELL_HEIGHT * 1}
						x={CELL_WIDTH *
							Math.floor(WIDTH / 2 - this.teletext.remote.texture.source.width / 2 / 2)}
						y={CELL_HEIGHT *
							Math.floor(HEIGHT / 3 - this.teletext.remote.texture.source.height / 2 / 3)}
						scale={{ x: CELL_WIDTH / 2, y: CELL_HEIGHT / 3 }}
					/>
				)}
				{!this.teletext.remote.connected && init != null && Date.now() - init > HELP_COOLDOWN &&
					(
						<pixiBitmapText
							style={{
								fill: 0xffffff,
								fontFamily: $EuropeanTeletext,
								fontSize: 32,
							}}
							text={`


















           Issues Connecting?
               Press  (F)`}
						/>
					)}
			</>
		);
	}
	getRedLabel(): string {
		return '';
	}
	getGreenLabel(): string {
		return '';
	}
	getYellowLabel(): string {
		return '';
	}
	getBlueLabel(): string {
		return '';
	}
}
