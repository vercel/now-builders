import { AddressInfo, Socket } from 'net';
import { APIGatewayProxyEvent } from 'aws-lambda';
import {
  Server,
  IncomingHttpHeaders,
  OutgoingHttpHeaders,
  request
} from 'http';

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

export interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value?: T | PromiseLike<T>) => void;
  reject: (reason?: any) => void;
}

export function createDeferred<T>(): Deferred<T> {
  let r;
  let j;
  const promise = new Promise<T>(
    (
      resolve: (value?: T | PromiseLike<T>) => void,
      reject: (reason?: any) => void
    ): void => {
      r = resolve;
      j = reject;
    }
  );
  if (!r || !j) {
    throw new Error('resolve or reject are undefined');
  }
  return { promise, resolve: r, reject: j };
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

export class Bridge {
  private server: Server | null;
  private listening: Deferred<AddressInfo>;
  private currentRequest: Deferred<NowProxyResponse> | null;
  private connections: Set<Socket>;

  constructor(server?: Server) {
    this.server = null;
    if (server) {
      this.setServer(server);
    }
    this.currentRequest = null;
    this.launcher = this.launcher.bind(this);
    this.listening = createDeferred<AddressInfo>();
    this.connections = new Set();
  }

  setServer(server: Server) {
    this.server = server;
    const unhandled = (err: Error) => {
      this.onUnhandledRejection(err);
    };
    process.on('unhandledRejection', unhandled);
    server.once('listening', () => {
      this.onListening();
    });
    server.once('close', () => {
      process.removeListener('unhandledRejection', unhandled);
    });
    server.on('connection', (socket: Socket) => {
      this.connections.add(socket);
      socket.on('close', () => {
        this.connections.delete(socket);
      });
    });
  }

  listen() {
    if (!this.server) {
      throw new Error('Server has not been set!');
    }

    return this.server.listen({
      host: '127.0.0.1',
      port: 0
    });
  }

  onListening() {
    if (!this.server) {
      throw new Error('Server has not been set!');
    }
    const addr = this.server.address();
    if (typeof addr === 'string') {
      const err = new Error(`Unexpected string for \`server.address()\`: ${addr}`);
      this.listening.reject(err);
    } else if (!addr) {
      const err = new Error('`server.address()` returned `null`');
      this.listening.reject(err);
    } else {
      this.listening.resolve(addr);
    }
  }

  onUnhandledRejection(err: Error) {
    if (this.currentRequest) {
      this.currentRequest.reject(err);
      for (const socket of this.connections) {
        socket.destroy();
      }
    } else {
      console.error(err);
      process.exit(1);
    }
  }

  launcher(
    event: NowProxyEvent | APIGatewayProxyEvent
  ): Promise<NowProxyResponse> {
    this.currentRequest = createDeferred<NowProxyResponse>();
    this.doReq(event).then((response: NowProxyResponse) => {
      this.currentRequest!.resolve(response);
      this.currentRequest = null;
    }).catch((err: Error) => {
      this.currentRequest!.reject(err);
      this.currentRequest = null;
    });
    return this.currentRequest.promise;
  }

  async doReq(
    event: NowProxyEvent | APIGatewayProxyEvent
  ): Promise<NowProxyResponse> {
    const { port } = await this.listening.promise;

    const { isApiGateway, method, path, headers, body } = normalizeEvent(
      event
    );

    const opts = {
      hostname: '127.0.0.1',
      port,
      path,
      method,
      headers
    };

    // eslint-disable-next-line consistent-return
    return new Promise((resolve, reject) => {
      const req = request(opts, res => {
        const respBodyChunks: Buffer[] = [];
        res.on('data', chunk => respBodyChunks.push(Buffer.from(chunk)));
        res.on('error', reject);
        res.on('end', () => {
          const bodyBuffer = Buffer.concat(respBodyChunks);
          delete res.headers.connection;

          if (isApiGateway) {
            delete res.headers['content-length'];
          } else if (res.headers['content-length']) {
            res.headers['content-length'] = String(bodyBuffer.length);
          }

          resolve({
            statusCode: res.statusCode || 200,
            headers: res.headers,
            body: bodyBuffer.toString('base64'),
            encoding: 'base64'
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

      req.end(body);
    });
  }
}
