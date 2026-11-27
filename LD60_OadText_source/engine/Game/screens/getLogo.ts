import logoSrc from 'assets/logos/logo.png?inline';

export default function() {
	const image = new Image();
	image.src = logoSrc;
	return image;
}
