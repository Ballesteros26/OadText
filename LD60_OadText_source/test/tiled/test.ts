import { describe, it } from 'vitest';

import assert from 'node:assert';
import path from 'node:path';
import fs from 'node:fs/promises';
import { tmx2js } from '../../vite/plugins/tiledPlugin';

// NOTE: excluded in vite.config.ts because it can't run in the browser

describe.skip('Tiled', function() {
	describe('transform', async function() {
		const testNames = (await fs.readdir('./test/tiled/input', { withFileTypes: true }))
			.filter(file => file.isFile())
			.map(file => path.basename(file.name, '.tmx'));
		// const expectedPaths = testNames.map(name => name + '.json');

		testNames.forEach(test => {
			it(test, async function() {
				const expectedPath = './test/tiled/expected/' + test + '.json';
				const inputPath = './test/tiled/input/' + test + '.tmx';
				const expected = JSON.parse(await fs.readFile(expectedPath, 'utf8')); // TODO check if available

				const result = await tmx2js(await fs.readFile(inputPath, 'utf8'), {
					fileTransform: file =>
						path.relative(path.dirname(expectedPath), path.resolve(path.dirname(inputPath), file)).replace(
							/\\/g,
							'/',
						),
				});
				assert.deepEqual(result, expected);
			});
		});
	});
});
