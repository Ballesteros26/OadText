import $EuropeanTeletext from 'assets/fonts/EuropeanTeletext.ttf';
import Page from '../Page';
import type Teletext from 'src/Teletext';
import { component } from 'engine/View/Decorators';
import once from 'engine/Events/once';
import KeyboardEventEmitter from 'engine/Events/Input/KeyboardEventEmitter';

export default class MoreConnect extends Page {
	private keyboard = new KeyboardEventEmitter();
	constructor(private teletext: Teletext, private sub: number) {
		super();

		this.registerColorButton();
		this.registerZButton();
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

	async registerZButton() {
		while (true) {
			const { value: c } = await this.keyboard.get('keydown', e => e.label === 'z');

			alert(`${this.teletext.remote.getUrl()}

The QR Code is also in the web console`);
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
					style={{
						fill: 0xffffff,
						fontFamily: $EuropeanTeletext,
						fontSize: 32,
					}}
					text={`

Help to get the remote connected:

`}
				/>
				<pixiBitmapText
					style={{
						fill: 0x00ffff,
						fontFamily: $EuropeanTeletext,
						fontSize: 32,
					}}
					text={`





A:Press Z



A:Change the batteries by "reloading"



A:You can do a complete reset by
  reloading this site in your browser.
  Note that you have to scan the QR code
  again, because the session changes
`}
				/>
				<pixiBitmapText
					style={{
						fill: 0xffff00,
						fontFamily: $EuropeanTeletext,
						fontSize: 32,
					}}
					text={`




Q:The QR-code does not get recognized



Q:The remote stops sending signals



Q:This did not help


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
