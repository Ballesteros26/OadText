import $EuropeanTeletext from 'assets/fonts/EuropeanTeletext.ttf';
import Page from '../Page';
import type Teletext from 'src/Teletext';
import { CELL_HEIGHT, CELL_WIDTH, HEIGHT, WIDTH } from 'src/Teletext';
import { component } from 'engine/View/Decorators';
import once from 'engine/Events/once';
import $PyramidCover from './PyramidCover.aseprite';
import $bricks from './bricks.aseprite';
import $pyramidBackground from './pyramidBackground.aseprite';
import $ufo from './ufo.aseprite';
import KeyboardEventEmitter from 'engine/Events/Input/KeyboardEventEmitter';

export default class PyramidDescription extends Page {
	private grid = [
		[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
		[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
		[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
		[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
		[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
		[0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 0, 0],
		[0, 1, 2, 0, 0, 0, 0, 1, 2, 1, 2, 0],
		[1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2],
	];

	private ufoPostion = 1;
	private ufoColldown = 0;
	private ufoDirection = 1;

	constructor(private teletext: Teletext) {
		super();

		this.registerColorButton();
	}
	private isWon() {
		return this.grid[2][5] === 1;
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
					if (this.ufoColldown <= 0 && !this.isWon()) {
						this.ufoColldown = 3;
						this.grid[0][this.ufoPostion] = 3;
						this.grid[0][this.ufoPostion + 1] = 4;
					}
					break;
				case 'BLUE':
					this.teletext.setPage(110);
					break;
			}
		}
	}

	async initialize() {
	}

	async run() {
		while (true) {
			await new Promise(r => setTimeout(r, 500));

			this.updateGrid();

			this.ufoPostion += this.ufoDirection;

			if (this.ufoPostion == 0) {
				this.ufoDirection = 1;
				this.ufoPostion = 2;
			}
			if (this.ufoPostion >= this.grid[0].length - 2) {
				this.ufoDirection = -1;
				this.ufoPostion = this.grid[0].length - 4;
			}
			this.ufoColldown--;
		}
		throw new Error('never');
	}

	updateGrid() {
		for (let y = this.grid.length - 1; y >= 0; y--) {
			for (let x = 0; x < this.grid[y].length; x++) {
				const value = this.grid[y][x];

				if (value === 3) {
					const v1 = this.grid[y + 1][x - 1];
					const v2 = this.grid[y + 1][x];
					const v3 = this.grid[y + 1][x + 1];
					const v4 = this.grid[y + 1][x + 2];

					if (v2 + v3 === 0) {
						this.grid[y + 1][x] = this.grid[y][x];
						this.grid[y][x] = 0;
					} else if (v1 * v2 * v3 * v4 === 0) {
						this.grid[y][x] = 0;
					} else {
						this.grid[y][x] -= 2;
						if (this.grid[y][x] === this.grid[y + 1][x]) {
							this.grid[y][x] = 0;
						}
					}
				}
				if (value === 4) {
					const v1 = this.grid[y + 1][x - 2];
					let v2 = this.grid[y + 1][x - 1];
					const v3 = this.grid[y + 1][x];
					const v4 = this.grid[y + 1][x + 1];

					if (v2 === 3) v2 = 0;

					if (v2 + v3 === 0) {
						this.grid[y + 1][x] = this.grid[y][x];
						this.grid[y][x] = 0;
					} else if (v1 * v2 * v3 * v4 === 0) {
						this.grid[y][x] = 0;
					} else {
						this.grid[y][x] -= 2;
						if (this.grid[y][x] === this.grid[y + 1][x]) {
							this.grid[y][x] = 0;
						}
					}
				}
			}
		}
	}

	@component()
	View() {
		return (
			<>
				<pixiContainer
					scale={{ x: CELL_WIDTH / 2, y: CELL_HEIGHT / 3 }}
				>
					<pixiSprite
						texture={$pyramidBackground.getTile(0, 0)}
					/>
					<pixiContainer
						x={24}
						y={14}
					>
						<this.Grid />
					</pixiContainer>
				</pixiContainer>
				{this.isWon() && (
					<pixiBitmapText
						x={CELL_WIDTH * 16}
						y={CELL_HEIGHT * 19}
						style={{
							fill: 0x000000,
							fontFamily: $EuropeanTeletext,
							fontSize: 32,
						}}
						text="YOU WIN!"
					/>
				)}
			</>
		);
	}

	@component()
	Grid() {
		return (
			<>
				{this.grid.map((row, i) => {
					return row.map((brick, col) => (
						<pixiSprite
							key={i * 100 + col}
							texture={$bricks.getTile(brick, 0)}
							x={col * $bricks.getTile(0, 0).width}
							y={i * $bricks.getTile(0, 0).height}
						/>
					));
				})}
				<pixiSprite
					texture={$ufo.getTile(this.ufoColldown <= 0 && !this.isWon() ? 0 : 1, 0)}
					x={(this.ufoPostion - 1) * $bricks.getTile(0, 0).width}
					y={-$bricks.getTile(0, 0).height * 3}
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
		return 'Drop';
	}
	getBlueLabel(): string {
		return 'Index';
	}
}
