import $EuropeanTeletext from 'assets/fonts/EuropeanTeletext.ttf';
import Page from '../Page';
import type Teletext from 'src/Teletext';
import { CELL_HEIGHT, CELL_WIDTH, HEIGHT, WIDTH } from 'src/Teletext';
import { component } from 'engine/View/Decorators';
import once from 'engine/Events/once';
import $hanoi from './hanoi.aseprite';
import $arrow from './arrow.aseprite';

function sum(array: number[]) {
	return array.reduce((a, b) => a + b, 0);
}

export default class Connect extends Page {
	private state: (1 | 2 | 3)[][];
	private validMoves: ({ from: number; to: number })[];

	constructor(private teletext: Teletext, private sub: number) {
		super();

		const s = sub - 1;
		this.state = [[], [], []];

		if (sub > 0) {
			const bluePosition = Math.floor(s / 9);
			const greenPosition = Math.floor((s % 9) / 3);
			const redPoston = s % 3;

			this.state[bluePosition].push(3);
			this.state[greenPosition].push(2);
			this.state[redPoston].push(1);
		}

		this.validMoves = this.getValidMoves(this.state);

		this.registerColorButton();
	}

	getValidMoves(state: (1 | 2 | 3)[][]) {
		const allMoves = [
			{ from: 0, to: 2 },
			{ from: 2, to: 0 },
			{ from: 0, to: 1 },
			{ from: 1, to: 0 },
			{ from: 1, to: 2 },
			{ from: 2, to: 1 },
		];

		return allMoves.filter(({ from, to }) => {
			const moving = state[from].at(-1);
			const onto = state[to].at(-1);

			if (moving == null) return false;
			if (onto == null) return true;
			return moving < onto;
		});
	}

	applyMove(state: (1 | 2 | 3)[][], move: { from: number; to: number }) {
		const copy = state.map(e => e.map(a => a));

		const moving = copy[move.from].pop()!;
		copy[move.to].push(moving);

		return sum(copy.map((stack, i) => sum(stack.map((piece) => i * 3 ** (piece - 1)))));
	}

	async registerColorButton() {
		while (true) {
			const { value: c } = await once(this.teletext.remote, 'color');

			switch (c) {
				case 'RED':
					const move = this.validMoves[0];
					if (move) {
						this.teletext.setPage(311 + this.applyMove(this.state, move));
					}
					break;
				case 'GREEN':
					const move2 = this.validMoves[1];
					if (move2) {
						this.teletext.setPage(311 + this.applyMove(this.state, move2));
					}
					break;
				case 'YELLOW':
					if (this.sub === 0) {
						this.teletext.setPage(p => p + 1);
						return;
					}
					const move3 = this.validMoves[2];
					if (move3) {
						this.teletext.setPage(311 + this.applyMove(this.state, move3));
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

	@component()
	View() {
		if (this.sub == 0) {
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
						text={`Towers of Hanoi

Move the tower to the rightmost
postion. A piece may never be on top
of a smaller piece.


Execute a move by pressing the
corresponding colored button`}
					/>
				</>
			);
		}

		return (
			<>
				<pixiContainer
					scale={{ x: CELL_WIDTH / 2, y: CELL_HEIGHT / 3 }}
				>
					{this.state.map((stack, i) => (
						<pixiContainer
							key={i}
							y={30}
							x={i * $hanoi.getTile(0, 0).width + 1}
						>
							<pixiSprite
								texture={$hanoi.getTile(0, 0)}
							/>
							{stack.map((stone, i) => (
								<pixiSprite
									key={stone}
									texture={$hanoi.getTile(stone, 0)}
									y={-i}
								/>
							))}
						</pixiContainer>
					))}
					{this.validMoves.map(({ from, to }, i) => (
						<pixiNineSliceSprite
							x={(Math.min(to, from) + 0.5) * $hanoi.getTile(0, 0).width + 1 -
								(Math.abs(to - from) == 2 ? 10 : 0)}
							width={Math.abs(to - from) * $hanoi.getTile(0, 0).width / (CELL_WIDTH / 2) +
								(Math.abs(to - from) == 2 ? 20 / (CELL_WIDTH / 2) : 0)}
							y={/*i * 5 +*/ 4}
							height={2}
							scale={{ x: CELL_WIDTH / 2, y: CELL_HEIGHT / 3 }}
							texture={$arrow.getTile((to < from ? 1 : 0) + (Math.abs(to - from) == 2 ? 2 : 0), 0)}
							tint={i === 0 ? 0xFF0000 : i === 1 ? 0x00FF00 : 0xFFFF00}
						/>
					))}
				</pixiContainer>
				{this.state[0].length == 0 && this.state[1].length == 0 && (
					<pixiBitmapText
						x={CELL_WIDTH}
						y={CELL_HEIGHT * 20}
						style={{
							fill: 0xFFFFFF,
							fontFamily: $EuropeanTeletext,
							fontSize: 32,
						}}
						text={`YOU WIN!
To try other start positions (312-336)`}
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
		return this.sub === 0 ? 'Start' : '';
	}
	getBlueLabel(): string {
		return 'Index';
	}
}
