import assert from 'assert';
import { createHash } from 'crypto';
import Sema from 'async-sema';
import fetch from 'node-fetch';
import { createZip } from './zip';
import { Files } from './types';
import { runNpmInstall } from '@now/build-utils';

const sema = new Sema(10);
const layerUrl = 'https://example.com/layer/'; // TODO: change

interface BuildLayerResult {
	files: Files;
}

type BuildLayerFunc = (config: LayerConfig) => BuildLayerResult;

export interface LayerConfig {
	runtimeVersion: string;
	platform: string;
	arch: string;
}

export async function getLayer({ use, config }: GetLayerOptions) {
	assert(typeof use === 'string', '"hash" must be a string');
	assert(typeof config === 'object', '"config" must be an object');

	const hash = await hashLayer({ use, config });
	let layer = await fetchAWSLayer(hash);

	if (layer) {
		return layer;
	}

	await runNpmInstall(dest, [use]);
	const { buildLayer } = require(use) as { buildLayer: BuildLayerFunc };
	const { files } = await buildLayer(config);
	layer = await createAWSLayer(hash, files);

	return layer;
}

interface GetLayerOptions {
	use: string;
	config: LayerConfig;
}

async function hashLayer(opt: GetLayerOptions): Promise<string> {
	return createHash('sha512')
		.update(JSON.stringify(opt))
		.digest('hex');
}

async function fetchAWSLayer(hash: string): Promise<Layer> {
	await sema.acquire();
	try {
		const res = await fetch(layerUrl + hash);
		const zipBuffer = Buffer.from(res.body);
		return new Layer({
			zipBuffer,
			hash,
		});
	} finally {
		sema.release();
	}
}

async function createAWSLayer(hash: string, files: Files): Promise<Layer> {
	await sema.acquire();
	try {
		const zipBuffer = await createZip(files);
		return new Layer({
			zipBuffer,
			hash,
		});
	} finally {
		sema.release();
	}
}

interface LayerOptions {
	hash: string;
	zipBuffer: Buffer;
}

export class Layer {
	public type: 'Layer';
	public hash: string;
	private zipBuffer: Buffer;

	constructor({ hash, zipBuffer }: LayerOptions) {
		this.type = 'Layer';
		this.hash = hash;
		this.zipBuffer = zipBuffer;
	}

	public decompress() {
		// TODO: unzip the buffer into files
		return this.zipBuffer;
	}
}
