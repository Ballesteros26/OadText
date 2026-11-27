import type Teletext from 'src/Teletext';
import type Page from './Page';

export async function getPage(number: number): Promise<
	{ page: { new (parent: Teletext, subPage: number): Page }; subPage: number }
> {
	if (number === 100) {
		return { page: (await import('./help/Connect')).default, subPage: 0 };
	}
	if (number === 101) {
		return { page: (await import('./help/NoRemote')).default, subPage: 0 };
	}
	if (number === 102) {
		return { page: (await import('./help/MoreConnect')).default, subPage: 0 };
	}
	if (number === 110) {
		return { page: (await import('./help/Index')).default, subPage: 0 };
	}
	if (number === 111) {
		return { page: (await import('./help/Tutorial')).default, subPage: 0 };
	}
	if (number >= 120 && number <= 130) {
		return { page: (await import('./news/News')).default, subPage: number - 120 };
	}
	if (number === 300) {
		return { page: (await import('./games/GameIndex')).default, subPage: 0 };
	}
	if (number >= 310 && number <= 337) {
		return { page: (await import('./games/Hanoi')).default, subPage: number - 310 };
	}
	if (number === 350) {
		return { page: (await import('./games/PyramidDescription')).default, subPage: 0 };
	}
	if (number === 351) {
		return { page: (await import('./games/PyramidStartScreen')).default, subPage: 0 };
	}
	if (number === 352) {
		return { page: (await import('./games/PyramidGame')).default, subPage: 0 };
	}
	if (number === 800) {
		return { page: (await import('./ads/StoreIndex')).default, subPage: 0 };
	}
	if (number === 810) {
		return { page: (await import('./ads/BlueButtons')).default, subPage: 0 };
	}
	if (number === 811) {
		return { page: (await import('./ads/RedButtons')).default, subPage: 0 };
	}
	if (number === 820) {
		return { page: (await import('./ads/Toad')).default, subPage: 0 };
	}
	if (number === 821) {
		return { page: (await import('./ads/Cancel')).default, subPage: 0 };
	}

	if (number === 420) {
		return { page: (await import('./hidden/Smile')).default, subPage: 0 };
	}
	if (number === 666) {
		return { page: (await import('./hidden/NoSmile')).default, subPage: 0 };
	}

	return { page: (await import('./help/NotFound')).default, subPage: 0 };
}
