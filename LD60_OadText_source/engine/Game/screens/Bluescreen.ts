import Process from '../../Process/Process';
import getLogo from './getLogo';

export default class Bluescreen extends Process<void> {
	constructor(parentElement: HTMLElement, error: Error, persistent: boolean) {
		super();
		console.error(error);

		const domElement = this.createDomElement(error);
		parentElement.appendChild(domElement);

		const callback = () => {
			this.exit();
			parentElement.removeChild(domElement);
			import.meta.hot?.off('vite:afterUpdate', callback);
		};
		if (__DEV__ && !persistent) {
			import.meta.hot?.on('vite:afterUpdate', callback);
		}
	}

	createDomElement(error: Error): HTMLElement {
		const div = document.createElement('div');
		const upperBox = document.createElement('div');
		const errorTitle = document.createElement('h1');
		const logo = getLogo();
		const lowerBox = document.createElement('div');
		const errorMessage = document.createElement('div');

		errorTitle.innerText = error.name;
		errorMessage.innerText = error.message;

		div.appendChild(upperBox);
		upperBox.appendChild(errorTitle);
		div.appendChild(logo);
		div.appendChild(lowerBox);
		lowerBox.appendChild(errorMessage);

		import('./createStackBox')
			.then(async ({ default: createStackBox }) => {
				lowerBox.appendChild(await createStackBox(error));
			});

		{
			const s = div.style;

			s.backgroundColor = '#005784';
			s.height = '100%';
			s.display = 'flex';
			s.flexDirection = 'column';
			s.alignItems = 'center';
			s.gap = '55px';
			s.overflow = 'hidden';

			s.fontWeight = 'bold';
			s.color = 'white';
			s.fontFamily = 'sans-serif';
			s.userSelect = 'none';
		}

		{
			const s = upperBox.style;

			s.display = 'flex';
			s.flexGrow = '1';
			s.flexBasis = '0';
		}

		{
			const s = errorTitle.style;

			s.alignSelf = 'flex-end';
			s.margin = '0';
			s.fontSize = '16px';
		}

		{
			logo.style.transform = 'scale(6, -6)';
			logo.style.imageRendering = 'pixelated';
		}

		{
			const s = lowerBox.style;

			s.display = 'flex';
			s.flexDirection = 'column';
			s.alignItems = 'center';

			s.fontSize = '14px';
			s.flexGrow = '1';
			s.flexBasis = '0';
			s.margin = '0';
		}

		return div;
	}
}
