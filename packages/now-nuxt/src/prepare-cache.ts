import { glob, PrepareCacheOptions } from '@now/build-utils/dist';

import path from 'path';
import fs from 'fs-extra';
import { startStep, endStep } from './utils';

export async function prepareCache({
  cachePath,
  workPath,
  entrypoint,
}: PrepareCacheOptions) {
  const entryDir = path.dirname(entrypoint);
  const rootDir = path.join(workPath, entryDir);
  const cacheDir = path.join(cachePath, entryDir);

  console.log('Cache dir:', cacheDir);

  startStep('Clean cache');
  await fs.remove(cacheDir);
  await fs.mkdirp(cacheDir);
  endStep();

  startStep('Collect cache');
  const cache = {};
  for (const dir of ['.now_cache', 'node_modules_dev', 'node_modules_prod']) {
    const src = path.join(rootDir, dir);
    const dst = path.join(cacheDir, dir);
    if (!(await fs.pathExists(src))) {
      console.warn(src, 'not exists. skipping!');
      continue;
    }
    await fs.rename(src, dst);
    const files = await glob(path.join(dir, '**'), cacheDir);
    console.log(`${Object.keys(files).length} files collected from ${dir}`);
    Object.assign(cache, files);
  }
  endStep();

  return cache;
}
