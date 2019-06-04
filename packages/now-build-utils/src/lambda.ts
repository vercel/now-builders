import assert from 'assert';
import Sema from 'async-sema';
import { createZip } from './zip';
import { Files } from './types';

interface Environment {
  [key: string]: string;
}

interface LambdaOptions {
  zipBuffer: Buffer;
  handler: string;
  runtime: string;
  environment: Environment;
}

interface CreateLambdaOptions {
  files: Files;
  handler: string;
  runtime: string;
  environment?: Environment;
}

export class Lambda {
  public type: 'Lambda';
  public zipBuffer: Buffer;
  public handler: string;
  public runtime: string;
  public environment: Environment;

  constructor({ zipBuffer, handler, runtime, environment }: LambdaOptions) {
    this.type = 'Lambda';
    this.zipBuffer = zipBuffer;
    this.handler = handler;
    this.runtime = runtime;
    this.environment = environment;
  }
}

const sema = new Sema(10);

export async function createLambda({
  files,
  handler,
  runtime,
  environment = {},
}: CreateLambdaOptions): Promise<Lambda> {
  assert(typeof files === 'object', '"files" must be an object');
  assert(typeof handler === 'string', '"handler" is not a string');
  assert(typeof runtime === 'string', '"runtime" is not a string');
  assert(typeof environment === 'object', '"environment" is not an object');

  await sema.acquire();

  try {
    const zipBuffer = await createZip(files);
    return new Lambda({
      zipBuffer,
      handler,
      runtime,
      environment,
    });
  } finally {
    sema.release();
  }
}
