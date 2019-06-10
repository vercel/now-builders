import { AddressInfo } from 'net';
import { APIGatewayProxyEvent, Context } from 'aws-lambda';
import {
  Server,
  IncomingHttpHeaders,
  OutgoingHttpHeaders,
  request,
  IncomingMessage,
  ServerResponse,
} from 'http';
import { NowAddon, NowAddonListener } from './types';

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

/**
 * If the `http.Server` handler function throws an error asynchronously,
 * then it ends up being an unhandled rejection which doesn't kill the node
 * process which causes the HTTP request to hang indefinitely. So print the
 * error here and force the process to exit so that the lambda invocation
 * returns an Unhandled error quickly.
 */
process.on('unhandledRejection', (err: Error) => {
  console.error('Unhandled rejection:', err);
  process.exit(1);
});

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

export class Bridge {
  private addons: { [key: string]: NowAddon };
  private listener: NowAddonListener | undefined;
  private server: Server;
  private listening: Promise<AddressInfo>;
  private reqSeed: number;
  private shouldSendAddon: boolean;

  constructor(listener?: NowAddonListener, shouldSendAddon?: boolean) {
    this.addons = {};
    this.listener = listener;
    this.reqSeed = 0;
    this.shouldSendAddon = shouldSendAddon || false;

    this.server = new Server((req, res) => {
      this.executeRequest(req, res);
    });

    this.listening = new Promise(resolve => {
      const addr = this.server.address();
      if (typeof addr === 'string') {
        throw new Error(`Unexpected string for \`server.address()\`: ${addr}`);
      } else if (!addr) {
        throw new Error('`server.address()` returned `null`');
      } else {
        resolve(addr);
      }
    });

    this.launcher = this.launcher.bind(this);

    this.server.listen({
      host: '127.0.0.1',
      port: 0,
    });
  }

  executeRequest(req: IncomingMessage, res: ServerResponse) {
    if (!this.listener) {
      throw new Error('listener has not been defined');
    }

    if (!this.shouldSendAddon) {
      this.listener(req, res);
    } else {
      const reqId = req.headers['x-bridge-reqid'];

      if (typeof reqId !== 'string') {
        throw new Error('x-bridge-reqid header is wrong or missing');
      }

      this.listener(req, res, this.addons[reqId] || {});
    }
  }

  async launcher(
    event: NowProxyEvent | APIGatewayProxyEvent,
    context: Context
  ): Promise<NowProxyResponse> {
    context.callbackWaitsForEmptyEventLoop = false;
    const { port } = await this.listening;

    const {
      isApiGateway,
      method,
      path,
      headers: _headers,
      body,
    } = normalizeEvent(event);

    let headers = _headers;

    if (this.shouldSendAddon) {
      const reqId = `${this.reqSeed++}`;
      this.addons[reqId] = { body };
      headers = { ...headers, 'x-bridge-reqid': reqId };
    }

    const opts = {
      hostname: '127.0.0.1',
      port,
      path,
      method,
      headers,
    };

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
}
