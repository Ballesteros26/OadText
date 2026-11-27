/// gfdf<reference no-default-lib="true"/>
//https://github.com/Microsoft/TypeScript-Handbook/blob/master/pages/Triple-Slash%20Directives.md

import Process from 'engine/Process/Process';
import { component } from 'engine/View/Decorators';

import { z } from 'zod';
import { Pond } from 'engine/Pond/Pond';
import { createPeer2PeerConnection } from 'engine/Pond/Utils/Peer2Peer';
import $EuropeanTeletext from 'assets/fonts/EuropeanTeletext.ttf';
import { type RemoteEventEmitter } from './remote/RemoteEventEmitter';
import EventEmitter from 'eventemitter3';
import once from 'engine/Events/once';
import type Page from './pages/Page';
import { getPage } from './pages/getPage';
import { Texture } from 'pixi.js';
import ImmediatePromise from 'engine/ImmediatePromise/ImmediatePromise';

export const WIDTH = 40;
export const HEIGHT = 25;
export const CELL_WIDTH = 24;
export const CELL_HEIGHT = 28;

const formatter = new Intl.DateTimeFormat(undefined, {
	dateStyle: 'short',
	timeStyle: 'medium',
});

export default class Teletext extends Process<number> /* extends FixedStepProcess<Number>*/ {
	private currentPage = 0;
	private wantedPage = 0;
	private wantedPageInput = '100';
	private wantedPageEventEmitter = new EventEmitter<{ select: (page: number) => void }>();
	private page: Page | null = null;
	private next: Page | null = null;
	private loadingPage = 400;

	constructor(public remote: RemoteEventEmitter) {
		super();

		this.remote.addListener('num', (type) => {
			if (this.wantedPageInput.length < 3) {
				this.wantedPageInput += type;
			} else if (!['0', '9'].includes(type)) {
				this.wantedPageInput = type;
			}
		});

		this.remote.addListener('p', (type) => {
			if (this.wantedPageInput.length === 3) {
				let current = parseInt(this.wantedPageInput) + (+type);
				if (current < 100) current = 899;
				if (current > 899) current = 100;
				this.wantedPageInput = `${current}`;
			} else {
				this.wantedPageInput = this.currentPage + type;
			}
		});
	}

	public setPage(page: number | ((x: number) => number)) {
		if (typeof page === 'number') {
			this.wantedPageInput = `${page}`;
		} else {
			this.wantedPageInput = `${page(this.wantedPage)}`;
		}
	}

	async load() {
		while (true) {
			await new Promise(r => setTimeout(r, 400));
			this.loadingPage += Math.floor(Math.random() * 70 + 20);
		}
	}

	async run() {
		// let next: Page | null = null;
		this.load();

		while (true) {
			const page = await ImmediatePromise.race([
				once(this.wantedPageEventEmitter, 'select'),
				once(this.remote, 'disconnected').then(() => ({ value: 100 })),
				once(this.remote, 'connected', () => this.wantedPage !== 100).then(e => ({ value: this.wantedPage })),
			]);

			this.next?.destroy();
			const ioeshg = await getPage(page.value);
			this.next = this.createProcess(ioeshg.page, this, ioeshg.subPage);

			this.next.initialize().then(() => {
				this.currentPage = page.value;
				this.page?.destroy();
				this.page = this.next;
				this.next = null;
			}).catch(e => {
				// context cancelled
			});
		}
		throw new Error('never');
		return -1;
	}

	public step(delta) {
		if (this.wantedPageInput.length === 3 && parseInt(this.wantedPageInput) !== this.wantedPage) {
			this.wantedPage = parseInt(this.wantedPageInput);
			this.wantedPageEventEmitter.emit('select', parseInt(this.wantedPageInput));
		}
	}

	@component()
	public StatusBar() {
		const part1 = `P${this.wantedPageInput.padEnd(3, '-')}  ${
			this.next != null ? ((this.loadingPage % 799) + 100) : this.currentPage
		}`;
		const part2 = 'OadText';
		const part3 = formatter.format(new Date());

		const space = WIDTH - part1.length - part2.length - part3.length;
		const space1 = Math.floor(space / 2);
		const space2 = Math.ceil(space / 2);

		return (
			<>
				<pixiBitmapText
					style={{
						fill: 0xffffff,
						fontFamily: $EuropeanTeletext,
						fontSize: 32,
					}}
					text={`${part1}${' '.repeat(space1)}${' '.repeat(part2.length)}${' '.repeat(space2)}${part3}`}
				/>
				<pixiBitmapText
					style={{
						fill: 0xffff00,
						fontFamily: $EuropeanTeletext,
						fontSize: 32,
					}}
					text={`${' '.repeat(part1.length)}${' '.repeat(space1)}${part2}`}
				/>
			</>
		);
	}

	@component()
	public View({ width, height }: { width: number; height: number }) {
		return (
			<>
				<this.StatusBar />
				<pixiContainer y={CELL_HEIGHT}>
					{this.page && <this.page.View />}
				</pixiContainer>
				<pixiSprite
					texture={Texture.WHITE}
					tint={0xFF0000}
					y={(HEIGHT - 1) * CELL_HEIGHT}
					width={CELL_WIDTH * 10}
					height={CELL_HEIGHT}
				/>
				<pixiSprite
					texture={Texture.WHITE}
					tint={0x00FF00}
					x={10 * CELL_WIDTH}
					y={(HEIGHT - 1) * CELL_HEIGHT}
					width={CELL_WIDTH * 10}
					height={CELL_HEIGHT}
				/>
				<pixiSprite
					texture={Texture.WHITE}
					tint={0xFFFF00}
					x={20 * CELL_WIDTH}
					y={(HEIGHT - 1) * CELL_HEIGHT}
					width={CELL_WIDTH * 10}
					height={CELL_HEIGHT}
				/>
				<pixiSprite
					texture={Texture.WHITE}
					tint={0x00FFFF}
					x={30 * CELL_WIDTH}
					y={(HEIGHT - 1) * CELL_HEIGHT}
					width={CELL_WIDTH * 10}
					height={CELL_HEIGHT}
				/>
				{this.page && (
					<>
						<pixiBitmapText
							y={(HEIGHT - 1) * CELL_HEIGHT}
							style={{
								// fill: 0xffffff,
								fontFamily: $EuropeanTeletext,
								fontSize: 32,
							}}
							text={this.page.getRedLabel().padEnd(10, ' ')}
						/>
						<pixiBitmapText
							x={10 * CELL_WIDTH}
							y={(HEIGHT - 1) * CELL_HEIGHT}
							style={{
								// fill: 0xffffff,
								fontFamily: $EuropeanTeletext,
								fontSize: 32,
							}}
							text={this.page.getGreenLabel().padEnd(10, ' ')}
						/>
						<pixiBitmapText
							x={20 * CELL_WIDTH}
							y={(HEIGHT - 1) * CELL_HEIGHT}
							style={{
								// fill: 0xffffff,
								fontFamily: $EuropeanTeletext,
								fontSize: 32,
							}}
							text={this.page.getYellowLabel().padEnd(10, ' ')}
						/>
						<pixiBitmapText
							x={30 * CELL_WIDTH}
							y={(HEIGHT - 1) * CELL_HEIGHT}
							style={{
								// fill: 0xffffff,
								fontFamily: $EuropeanTeletext,
								fontSize: 32,
							}}
							text={this.page.getBlueLabel().padEnd(10, ' ')}
						/>
					</>
				)}
			</>
		);
	}
}
