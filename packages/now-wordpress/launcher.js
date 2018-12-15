const assert = require('assert');
const { spawn } = require('child_process');
const { connect, query } = require('./fastcgi/index.js');
const { whenPortOpens } = require('./port.js');

let running;

async function startPhp() {
  assert(!running);

  const child = spawn(
    './php-fpm',
    ['-c', 'php.ini',
      '--fpm-config', '/var/task/native/fpm.ini',
      '--nodaemonize'],
    {
      stdio: 'inherit',
      cwd: '/var/task/native',
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
  let statusCode = 200;
  const headers = {};
  // eslint-disable-next-line no-param-reassign
  if (!body) body = Buffer.alloc(0);
  assert(Buffer.isBuffer(body));

  for (let i = 0; i < tuples.length; i += 2) {
    const k = tuples[i].toLowerCase();
    const v = tuples[i + 1];
    if (k === 'status') {
      statusCode = Number(v.split(' ')[0]); // '408 Request Timeout'
    } else {
      if (!headers[k]) headers[k] = [];
      headers[k].push(v);
    }
  }

  return {
    statusCode,
    headers,
    body: body.toString('base64'),
    encoding: 'base64',
  };
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

/*
(async function() {
  console.log(await launcher({
    httpMethod: 'GET',
    path: '/phpinfo.php'
  }));
})();
*/
