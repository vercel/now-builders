import { tmpdir } from 'os';
import { join } from 'path';
import { glob } from '@now/build-utils';
import { mkdir, remove, pathExists } from 'fs-extra';
import { installNode } from './install-node';

interface Config {
  nodeVersion: string;
}

export async function buildLayer({ nodeVersion }: Config) {
  const dir = join(tmpdir(), `now-node-runtime-${nodeVersion}`);
  const exists = await pathExists(dir);
  if (exists) {
    await remove(dir);
  }
  await mkdir(dir);
  await installNode(dir, nodeVersion);
  const files = await glob('**', { cwd: dir });
  return { files };
}
