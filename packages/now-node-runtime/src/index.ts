import { tmpdir } from 'os';
import { join } from 'path';
import { glob } from '@now/build-utils';
import { installNode } from './install-node';

interface Config {
  nodeVersion: string;
}

export async function buildLayer({ nodeVersion }: Config) {
  const dir = join(tmpdir(), 'downloads');
  await installNode(dir, nodeVersion);
  const files = await glob('**', { cwd: dir });
  return { files };
}
