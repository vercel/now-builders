const assert = require('assert');
const { join: pathJoin } = require('path');
const { spawn } = require('child_process');
const { connect, query } = require('./fastcgi/index.js');
const { whenPortOpens } = require('./port.js');

let running;

async function startPhp() {
  assert(!running);

  const child = spawn(
    './php-fpm',
    ['-c', 'php.ini',
      '-t', pathJoin(__dirname, 'user'),
      '-S', '127.0.0.1:9000',
      pathJoin(__dirname, 'filter.php')],
    {
      stdio: 'inherit',
      cwd: pathJoin(__dirname, 'native'),
    },
  );

  child.on('exit', () => {
    console.error('php exited');
    process.exit();
  });

  child.on('error', (error) => {
    console.error(error);
    process.exit();
  });

  await whenPortOpens(9000, 400);
  await connect();
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
      method, path, headers, body,
    };
  }

  const {
    httpMethod: method, path, headers, body,
  } = event;

  return {
    method, path, headers, body,
  };
}

function transformFromAwsRequest({
  method, path, headers, body,
}) {
  return {
    params: {
      REQUEST_METHOD: method,
      SCRIPT_FILENAME: path, // TODO only document
    },
  };
}

function transformToAwsResponse({ tuples, body }) {
/*
[ 'Status',
  '408 Request Timeout',
  'X-Powered-By',
  'PHP/7.2.10-0ubuntu0.18.04.1',
  'Content-type',
  'text/html; charset=UTF-8' ]
*/
}

async function launcher(event) {
  if (!running) {
    await startPhp();
    running = true;
  }

  const awsRequest = normalizeEvent(event);
  const input = transformFromAwsRequest(awsRequest);
  const output = await query(input);
  return transformToAwsResponse(output);
}

exports.launcher = launcher;
