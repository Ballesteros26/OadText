import Process from 'engine/Process/Process';

export default abstract class Page extends Process<never> {
	abstract initialize(): Promise<void>;

	abstract View(): React.ReactNode;

	abstract getRedLabel(): string;
	abstract getGreenLabel(): string;
	abstract getYellowLabel(): string;
	abstract getBlueLabel(): string;
}
