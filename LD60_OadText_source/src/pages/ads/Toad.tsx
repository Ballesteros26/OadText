import $EuropeanTeletext from 'assets/fonts/EuropeanTeletext.ttf';
import Page from '../Page';
import type Teletext from 'src/Teletext';
import { CELL_HEIGHT, CELL_WIDTH } from 'src/Teletext';
import { component } from 'engine/View/Decorators';
import once from 'engine/Events/once';
import $toad from './toad.aseprite';

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
					this.teletext.remote.send('crazy-toad');
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
					texture={$toad.getTile(0, 0)}
					scale={{ x: CELL_WIDTH / 2, y: CELL_HEIGHT / 3 }}
				/>
				<pixiBitmapText
					x={CELL_WIDTH}
					y={CELL_HEIGHT}
					style={{
						fill: 0xffffff,
						fontFamily: $EuropeanTeletext,
						fontSize: 32,
					}}
					text={`

						






						
 Subscribe to the crazy toad
 and get cool new sound
 effects!
`}
				/>
				<pixiBitmapText
					x={CELL_WIDTH}
					y={CELL_HEIGHT}
					style={{
						fill: 0xffff00,
						fontFamily: $EuropeanTeletext,
						fontSize: 32,
					}}
					text={`

						






						





                           Turn up
                          volume of
                           remote! `}
				/>
			</>
		);
	}
	getRedLabel(): string {
		return 'Cancel';
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
