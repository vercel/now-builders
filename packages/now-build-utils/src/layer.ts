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
  const ids = options.map(o => getId(o));
  const res = await fetch(`${layerUrl}/exists?ids=${ids.join(',')}`);
  const existsArray = (await res.json()) as boolean[];
  const layers: Layer[] = [];
  for (let i = 0; i < options.length; i++) {
    const opt = options[i];
    const id = ids[i];
    const exists = existsArray[i];
    let layer: Layer;
    if (exists) {
      layer = new Layer({ id });
    } else {
      layer = await createLayer(id, opt);
    }
    layers.push(layer);
  }
  return layers;
}

async function createLayer(
  id: string,
  { use, config }: GetLayerOptions
): Promise<Layer> {
  const cwd = await getWritableDirectory();
  await runNpmInstall(cwd, [use]);
  const { buildLayer } = require(join(cwd, use)) as {
    buildLayer: BuildLayerFunc;
  };
  const { files } = await buildLayer(config);
  const zipBuffer = await createZip(files);
  await fetch(`${layerUrl}/upload?id=${id}`, {
    method: 'POST',
    body: zipBuffer,
  });
  return new Layer({ id, files });
}

interface GetLayerOptions {
  use: string;
  config: LayerConfig;
}

function getId(opt: GetLayerOptions): string {
  return createHash('sha512')
    .update(JSON.stringify(opt))
    .digest('hex');
}

interface LayerOptions {
  id: string;
  files?: Files;
}

export class Layer {
  public type: 'Layer';
  public id: string;
  private files: Files | undefined;

  constructor({ id, files }: LayerOptions) {
    this.type = 'Layer';
    this.id = id;
    this.files = files;
  }

  async getFiles(): Promise<Files> {
    if (this.files) {
      return this.files;
    }
    const res = await fetch(`${layerUrl}/download?layerId=${this.id}`);
    const files = await createFiles(res.body);
    this.files = files;
    return files;
  }
}
