import * as http from 'http';
import { AddressInfo } from 'net';

let listener;
let server: http.Server;
let userError: Error;
let resolveListening;
let listening: Promise<AddressInfo> = new Promise(resolve => {
  resolveListening = resolve;
});

// The first `http.Server` instance with its `listen()` function
// invoked is the server that is used for the lambda invocations.
http.Server.prototype.listen = (listen => function (...args) {
  server = this;

  server.once('listening', () => {
    resolveListening(server.address());
  });

  // Restore original `listen()` function
  http.Server.prototype.listen = listen;

  // Invoke original `listen()` function
  return server.listen(...args);
})(http.Server.prototype.listen);

// Load the user code
try {
  if (!process.env.NODE_ENV) {
    process.env.NODE_ENV = 'production';
  }

  // PLACEHOLDER
} catch (error) {
  console.error(error);
  userError = error;
}

if (typeof listener === 'function') {
  // User code exported a handler function, so create an `http.Server` for it
  server = new http.Server(listener);
} else if (listener && listener instanceof http.Server && !server) {
  // User code exported an `http.Server` instance, call `listen()` on it
  server = listener;
}

if (server) {
  server.listen();
}

export async function launcher (event): Promise<any> {
  const { port } = await listening;

  return new Promise((resolve, reject) => {
    if (userError) {
      console.error('Error while initializing entrypoint:', userError);
      return resolve({ statusCode: 500, body: '' });
    }

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

    const req = http.request(opts, (res) => {
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

    req.end(body);
  });
}

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
