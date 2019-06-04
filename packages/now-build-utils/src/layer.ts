import { createHash } from 'crypto';
import { join } from 'path';
import fetch from 'node-fetch';
import { createZip, createFiles } from './zip';
import { Files } from './types';
import { runNpmInstall } from './fs/run-user-scripts';
import getWritableDirectory from './fs/get-writable-directory';

const layerUrl = 'https://example.com/'; // TODO: create backend API

interface BuildLayerResult {
  files: Files;
}

type BuildLayerFunc = (config: LayerConfig) => BuildLayerResult;

export interface LayerConfig {
  runtimeVersion: string;
  platform: string;
  arch: string;
}

export async function getLayers(options: GetLayerOptions[]): Promise<Layer[]> {
  const hashes = options.map(o => hashLayer(o));
  const res = await fetch(`${layerUrl}/exists?hashes=${hashes.join(',')}`);
  const existsArray = (await res.json()) as boolean[];
  const layers: Layer[] = [];
  for (let i = 0; i < options.length; i++) {
    const opt = options[i];
    const hash = hashes[i];
    const exists = existsArray[i];
    let layer: Layer;
    if (exists) {
      layer = new Layer({ hash });
    } else {
      layer = await createLayer(hash, opt);
    }
    layers.push(layer);
  }
  return layers;
}

async function createLayer(
  hash: string,
  { use, config }: GetLayerOptions
): Promise<Layer> {
  const cwd = await getWritableDirectory();
  await runNpmInstall(cwd, [use]);
  const { buildLayer } = require(join(cwd, use)) as {
    buildLayer: BuildLayerFunc;
  };
  const { files } = await buildLayer(config);
  const zipBuffer = await createZip(files);
  await fetch(`${layerUrl}/upload?hash=${hash}`, {
    method: 'POST',
    body: zipBuffer,
  });
  return new Layer({ hash, files });
}

interface GetLayerOptions {
  use: string;
  config: LayerConfig;
}

function hashLayer(opt: GetLayerOptions): string {
  return createHash('sha512')
    .update(JSON.stringify(opt))
    .digest('hex');
}

interface LayerOptions {
  hash: string;
  files?: Files;
}

export class Layer {
  public type: 'Layer';
  public hash: string;
  private files: Files | undefined;

  constructor({ hash, files }: LayerOptions) {
    this.type = 'Layer';
    this.hash = hash;
    this.files = files;
  }

  async getFiles(): Promise<Files> {
    if (this.files) {
      return this.files;
    }
    const res = await fetch(`${layerUrl}/download?layerId=${this.hash}`);
    const files = await createFiles(res.body);
    this.files = files;
    return files;
  }
}
