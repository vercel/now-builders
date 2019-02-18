import { AddressInfo } from 'net';
import { Server, request } from 'http';

function normalizeEvent(event) {
  let method: string;
  let path: string;
  let body: Buffer | string;
  let encoding: string;
  let headers;
  let isApiGateway = true;

  if (event.Action === 'Invoke') {
    isApiGateway = false;
    ({ method, path, headers, encoding, body } = JSON.parse(event.body));

    if (body) {
      if (encoding === 'base64') {
        body = Buffer.from(body as string, encoding);
      } else if (encoding === undefined) {
        body = Buffer.from(body as string);
      } else {
        throw new Error(`Unsupported encoding: ${encoding}`);
      }
    }
  } else {
    ({ httpMethod: method, path, headers, body } = event);
  }

  return { isApiGateway, method, path, headers, body };
}

export class Bridge {
  private server: Server;
  private listening: Promise<AddressInfo>;
  private resolveListening: (info: AddressInfo) => void;

  constructor(server?: Server) {
    this.server = null;
    if (server) {
      this.setServer(server);
    }
    this.launcher = this.launcher.bind(this);
  }

  setServer(server: Server) {
    this.server = server;
    this.listening = new Promise(resolve => {
      this.resolveListening = resolve;
    });
    server.once('listening', () => {
      this.resolveListening(server.address() as AddressInfo);
    });
  }

  listen(opts) {
    return this.server.listen({
      host: '127.0.0.1',
      port: 0
    });
  }

  async launcher(event) {
    const { port } = await this.listening;

    // eslint-disable-next-line consistent-return
    return new Promise((resolve, reject) => {
      const {
        isApiGateway, method, path, headers, body,
      } = normalizeEvent(event);

      const opts = {
        hostname: '127.0.0.1',
        port,
        path,
        method,
        headers,
      };

      const req = request(opts, (res) => {
        const response = res;
        const respBodyChunks = [];
        response.on('data', chunk => respBodyChunks.push(Buffer.from(chunk)));
        response.on('error', reject);
        response.on('end', () => {
          const bodyBuffer = Buffer.concat(respBodyChunks);
          delete response.headers.connection;

          if (isApiGateway) {
            delete response.headers['content-length'];
          } else
          if (response.headers['content-length']) {
            response.headers['content-length'] = String(bodyBuffer.length);
          }

          resolve({
            statusCode: response.statusCode,
            headers: response.headers,
            body: bodyBuffer.toString('base64'),
            encoding: 'base64',
          });
        });
      });

      req.on('error', (error) => {
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
