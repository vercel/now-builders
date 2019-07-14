const { spawn } = require('child_process');
const { parse: parseUrl } = require('url');
const { join: pathJoin } = require('path');

const PHP_DIR = pathJoin(process.env.LAMBDA_TASK_ROOT, 'php');
const USER_DIR = pathJoin(process.env.LAMBDA_TASK_ROOT, 'user');
const isDev = process.env.NOW_PHP_DEV === '1';

function normalizeEvent(event) {
  if (event.Action === 'Invoke') {
    const invokeEvent = JSON.parse(event.body);

    const {
      method, path, host, headers, encoding,
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
      host,
      headers,
      body,
    };
  }

  const {
    httpMethod: method, path, host, headers, body,
  } = event;

  return {
    method,
    path,
    host,
    headers,
    body,
  };
}

async function transformFromAwsRequest({
  method, path, host, headers, body,
}) {
  const { pathname } = parseUrl(path);

  const filename = pathJoin(USER_DIR, process.env.NOW_ENTRYPOINT || pathname);

  return {
    filename,
    path,
    host,
    method,
    headers,
    body,
  };
}

function createCGIReq({
  filename, path, host, method, headers,
}) {
  const { search } = parseUrl(path);

  const env = {
    SERVER_ROOT: USER_DIR,
    DOCUMENT_ROOT: USER_DIR,
    SERVER_NAME: host,
    SERVER_PORT: 443,
    HTTPS: 'On',
    REDIRECT_STATUS: 200,
    SCRIPT_NAME: filename,
    REQUEST_URI: host + path,
    SCRIPT_FILENAME: filename,
    PATH_TRANSLATED: filename,
    REQUEST_METHOD: method,
    QUERY_STRING: search || '',
    GATEWAY_INTERFACE: 'CGI/1.1',
    SERVER_PROTOCOL: 'HTTP/1.1',
    PATH: process.env.PATH,
    SERVER_SOFTWARE: 'ZEIT Now PHP',
    LD_LIBRARY_PATH: process.env.LD_LIBRARY_PATH,
  };

  if (headers['content-length']) {
    env.CONTENT_LENGTH = headers['content-length'];
  }

  if (headers['content-type']) {
    env.CONTENT_TYPE = headers['content-type'];
  }

  if (headers['x-real-ip']) {
    env.REMOTE_ADDR = headers['x-real-ip'];
  }

  // expose request headers
  Object.keys(headers).forEach((header) => {
    const name = `HTTP_${header.toUpperCase().replace(/-/g, '_')}`;
    env[name] = headers[header];
  });

  if (!isDev) {
    env.PATH = `${PHP_DIR}:${process.env.PATH}`;
  }

  return {
    env,
  };
}
function parseCGIHeaders(headers) {
  if (!headers) return {};

  const result = {};

  // eslint-disable-next-line no-restricted-syntax
  for (const header of headers.split('\n')) {
    const index = header.indexOf(':');
    const key = header
      .slice(0, index)
      .trim()
      .toLowerCase();
    const value = header.slice(index + 1).trim();

    if (typeof result[key] === 'undefined') {
      result[key] = value;
    } else if (Array.isArray(result[key])) {
      result[key].push(value);
    } else {
      result[key] = [result[key], value];
    }
  }

  return result;
}

function parseCGIResponse(response) {
  const headersPos = response.indexOf('\r\n\r\n');
  if (headersPos === -1) {
    return {
      headers: {},
      body: response,
      statusCode: 200,
    };
  }

  let statusCode = 200;
  const rawHeaders = response.substr(0, headersPos);
  const rawBody = response.substr(headersPos);

  const headers = parseCGIHeaders(rawHeaders);

  if (headers.status) {
    statusCode = parseInt(headers.status, 10) || 200;
  }

  return {
    headers,
    body: rawBody,
    statusCode,
  };
}

function query({
  filename, path, host, headers, method, body,
}) {
  console.log(`🐘 Spawning: php-cgi ${filename}`);

  const { env } = createCGIReq({
    filename,
    path,
    host,
    headers,
    method,
  });

  return new Promise((resolve) => {
    let response = '';

    const php = spawn('php-cgi', ['-c', 'php.ini', filename], {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: PHP_DIR,
      env,
    });

    // Output
    php.stdout.on('data', (data) => {
      response += data.toString();
    });

    // Logging
    php.stderr.on('data', (data) => {
      console.error('🐘 STDERR', data.toString());
    });

    // PHP script execution end
    php.on('close', (code, signal) => {
      if (code !== 0) {
        console.log(`🐘 PHP process closed code ${code} and signal ${signal}`);
      }

      const {
        body: cgiBody,
        headers: cgiHeaders,
        statusCode,
      } = parseCGIResponse(response);

      resolve({
        body: cgiBody,
        headers: cgiHeaders,
        statusCode,
      });
    });

    php.on('error', (err) => {
      resolve({
        body: `PHP process errored ${err}`,
        headers: {},
        statusCode: 500,
      });
    });

    // Writes the body into the PHP stdin
    php.stdin.setEncoding('utf-8');
    php.stdin.write(body || '');
    php.stdin.end();
  });
}

function transformToAwsResponse({ statusCode, headers, body }) {
  return {
    statusCode,
    headers,
    body,
  };
}

async function launcher(event) {
  const awsRequest = normalizeEvent(event);
  const input = await transformFromAwsRequest(awsRequest);
  const output = await query(input);
  return transformToAwsResponse(output);
}

exports.launcher = launcher;

// (async function() {
//   console.log(await launcher({
//     httpMethod: 'GET',
//     path: '/index.php'
//   }));
// })();
