const { join: pathJoin } = require('path');
const http = require('http');
const { spawn } = require('child_process');
const { whenPortOpensCallback } = require('./port.js');

let phpServer;

function startPhp(cb) {
  if (phpServer) {
    cb();
    return;
  }

  phpServer = spawn(
    './php',
    ['-c', 'php.ini',
      '-t', pathJoin(__dirname, 'user'),
      '-S', '127.0.0.1:9000',
      pathJoin(__dirname, 'filter.php')],
    {
      stdio: 'inherit',
      cwd: pathJoin(__dirname, 'native'),
    },
  );

  phpServer.on('exit', () => {
    console.error('php exited');
    process.exit();
  });

  phpServer.on('error', (error) => {
    console.error(error);
    process.exit();
  });

  whenPortOpensCallback(9000, 400, cb);
}

function normalizeEvent(event) {
  if (event.Action === 'Invoke') {
    const invokeEvent = JSON.parse(event.body);

    const {
      method, path, headers, encoding,
    } = invokeEvent;

    let { body } = invokeEvent;

    if (body) {
      if (encoding === 'base64') {
        body = Buffer.from(body, encoding);
      } else if (encoding === undefined) {
        body = Buffer.from(body);
      } else {
        throw new Error(`Unsupported encoding: ${encoding}`);
      }
    }

    return {
      method,
      path,
      headers,
      body,
    };
  }

  const {
    httpMethod: method, path, headers, body,
  } = event;

  return {
    method,
    path,
    headers,
    body,
  };
}

class Bridge {
  constructor() {
    this.launcher = this.launcher.bind(this);
  }

  launcher(event) {
    // eslint-disable-next-line consistent-return
    return new Promise((resolve, reject) => {
      console.log('startPhp');
      startPhp(() => {
        console.log('startPhp-2');
        if (this.userError) {
          console.error('Error while initializing entrypoint:', this.userError);
          resolve({ statusCode: 500, body: '' });
          return;
        }

        if (!this.port) {
          resolve({ statusCode: 504, body: '' });
          return;
        }

        const {
          method, path, headers, body,
        } = normalizeEvent(event);

        const opts = {
          hostname: '127.0.0.1',
          port: this.port,
          path,
          method,
          headers,
        };

        const req = http.request(opts, (res) => {
          const response = res;
          const respBodyChunks = [];
          response.on('data', chunk => respBodyChunks.push(Buffer.from(chunk)));
          response.on('error', error => reject(error));
          response.on('end', () => {
            delete response.headers.connection;
            delete response.headers['content-length'];

            resolve({
              statusCode: response.statusCode,
              headers: response.headers,
              body: Buffer.concat(respBodyChunks).toString('base64'),
              encoding: 'base64',
            });
          });
        });

        req.on('error', (error) => {
          resolve({
            statusCode: 500,
            body: Buffer.from(error.message || error).toString('base64'),
            encoding: 'base64',
          });
        });

        if (body) req.write(body);
        req.end();
      });
    });
  }
}

module.exports = {
  Bridge,
};
