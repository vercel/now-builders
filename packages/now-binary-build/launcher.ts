import { APIGatewayProxyEvent, Context } from 'aws-lambda';
import { join } from 'path';
import waitOn from 'wait-on';
import { PassThrough } from 'stream';
import execa from 'execa';
import { spawn } from 'child_process';
import { pathExists, readFile, remove, writeFile } from 'fs-extra';
import { IncomingHttpHeaders, OutgoingHttpHeaders, request } from 'http';

interface NowProxyEvent {
  Action: string;
  body: string;
}

export interface NowProxyRequest {
  isApiGateway?: boolean;
  method: string;
  path: string;
  headers: IncomingHttpHeaders;
  body: Buffer;
}

export interface NowProxyResponse {
  statusCode: number;
  headers: OutgoingHttpHeaders;
  body: string;
  encoding: string;
}

function normalizeNowProxyEvent(event: NowProxyEvent): NowProxyRequest {
  let bodyBuffer: Buffer | null;
  const { method, path, headers, encoding, body } = JSON.parse(event.body);

  if (body) {
    if (encoding === 'base64') {
      bodyBuffer = Buffer.from(body, encoding);
    } else if (encoding === undefined) {
      bodyBuffer = Buffer.from(body);
    } else {
      throw new Error(`Unsupported encoding: ${encoding}`);
    }
  } else {
    bodyBuffer = Buffer.alloc(0);
  }

  return { isApiGateway: false, method, path, headers, body: bodyBuffer };
}

function normalizeAPIGatewayProxyEvent(
  event: APIGatewayProxyEvent
): NowProxyRequest {
  let bodyBuffer: Buffer | null;
  const { httpMethod: method, path, headers, body } = event;

  if (body) {
    if (event.isBase64Encoded) {
      bodyBuffer = Buffer.from(body, 'base64');
    } else {
      bodyBuffer = Buffer.from(body);
    }
  } else {
    bodyBuffer = Buffer.alloc(0);
  }

  return { isApiGateway: true, method, path, headers, body: bodyBuffer };
}

function normalizeEvent(
  event: NowProxyEvent | APIGatewayProxyEvent
): NowProxyRequest {
  if ('Action' in event) {
    if (event.Action === 'Invoke') {
      return normalizeNowProxyEvent(event);
    } else {
      throw new Error(`Unexpected event.Action: ${event.Action}`);
    }
  } else {
    return normalizeAPIGatewayProxyEvent(event);
  }
}

const BINARY = '__NOW_BINARY';
const PORT = '__NOW_PORT';
const READY_TEXT: string = '__NOW_READY_TEXT';

export async function launcher(
  event: NowProxyEvent | APIGatewayProxyEvent,
  context: Context
): Promise<NowProxyResponse> {
  context.callbackWaitsForEmptyEventLoop = false;
  const { isApiGateway, method, path, headers, body } = normalizeEvent(event);

  const opts = {
    hostname: '127.0.0.1',
    port: PORT,
    path,
    method,
    headers,
  };

  // check if container is reused
  const pidPath = join('/tmp', 'NOWPID');
  const hasPID = await pathExists(pidPath);
  let running = hasPID;

  if (hasPID) {
    const pid = await readFile(pidPath, 'utf8');
    try {
      await execa('kill', ['-0', pid]);
    } catch (e) {
      running = false;
      await remove(pidPath);
    }
  }

  if (!running) {
    const [cmd, ...args] = BINARY.split(' ');
    console.log(`Starting ${cmd}...`);
    const subprocess = spawn(cmd, args, {
      stdio: ['pipe', 'pipe', 'inherit'],
      detached: true,
    });

    const inherit = new PassThrough();
    const watcher = new PassThrough();

    subprocess.stdout.pipe(inherit);
    subprocess.stdout.pipe(watcher);
    inherit.pipe(process.stdout);

    if (READY_TEXT !== '') {
      console.log('Waiting for readyText output...');

      await new Promise(resolve => {
        watcher.on('data', (chunk: string) => {
          if (chunk.includes(READY_TEXT)) {
            return resolve();
          }
        });
      });
    }

    console.log(`Waiting for port ${PORT} to become available...`);

    await waitOn({
      resources: [`tcp:127.0.0.1:${PORT}`],
      tcpTimeout: 50,
      interval: 50,
    });

    await writeFile(pidPath, subprocess.pid);
    console.log('Ready');
  }

  // eslint-disable-next-line consistent-return
  return new Promise((resolve, reject) => {
    const req = request(opts, res => {
      const response = res;
      const respBodyChunks: Buffer[] = [];
      response.on('data', chunk => respBodyChunks.push(Buffer.from(chunk)));
      response.on('error', reject);
      response.on('end', () => {
        const bodyBuffer = Buffer.concat(respBodyChunks);
        delete response.headers.connection;

        if (isApiGateway) {
          delete response.headers['content-length'];
        } else if (response.headers['content-length']) {
          response.headers['content-length'] = String(bodyBuffer.length);
        }

        resolve({
          statusCode: response.statusCode || 200,
          headers: response.headers,
          body: bodyBuffer.toString('base64'),
          encoding: 'base64',
        });
      });
    });

    req.on('error', error => {
      setTimeout(() => {
        // this lets express print the true error of why the connection was closed.
        // it is probably 'Cannot set headers after they are sent to the client'
        reject(error);
      }, 2);
    });

    if (body) req.write(body);
    req.end();
  });
}
