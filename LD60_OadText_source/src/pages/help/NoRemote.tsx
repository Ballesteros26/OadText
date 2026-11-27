import $EuropeanTeletext from 'assets/fonts/EuropeanTeletext.ttf';
import Page from '../Page';
import type Teletext from 'src/Teletext';
import { CELL_HEIGHT, CELL_WIDTH, HEIGHT, WIDTH } from 'src/Teletext';
import { component } from 'engine/View/Decorators';
import once from 'engine/Events/once';
import $RemoteControl from './RemoteControl.aseprite';

export default class Connect extends Page {
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
					this.teletext.setPage(111);
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
					texture={$RemoteControl.getTile(0, 0)}
					scale={{ x: CELL_WIDTH / 2, y: CELL_HEIGHT / 3 }}
				/>
				<pixiBitmapText
					style={{
						fill: 0x000000,
						fontFamily: $EuropeanTeletext,
						fontSize: 32,
					}}
					text={`




    7  8  9
   
    4  5  6

    1  2  3

    <  0  >
   
   
   
    A S D F
						`}
				/>
				<pixiBitmapText
					style={{
						fill: 0xFFFFFF,
						fontFamily: $EuropeanTeletext,
						fontSize: 32,
					}}
					text={`




              The remote does not work?



                  Alternatively use
                    your keyboard



               The buttons are mapped
              as displayed on the left
   
   
						`}
				/>
			</>
		);
	}
	getRedLabel(): string {
		return 'P+     (A)';
	}
	getGreenLabel(): string {
		return 'P-     (S)';
	}
	getYellowLabel(): string {
		return 'Help   (D)';
	}
	getBlueLabel(): string {
		return 'Index  (F)';
	}
}
