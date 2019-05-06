import resolveFrom from 'resolve-from';
import { parse } from 'url';
import getPort from 'get-port';
import { createServer } from 'http';

process.on('unhandledRejection', err => {
  console.error('Exiting builder due to build error:');
  console.error(err);
  process.exit(1);
});

function syncRuntimeEnvVars() {
  const runtimeEnv = JSON.parse(
    Buffer.from(process.argv[2], 'base64').toString()
  );
  const runtimeKeys = Object.keys(runtimeEnv);
  for (const name of Object.keys(process.env)) {
    if (!runtimeKeys.includes(name)) {
      delete process.env[name];
    }
  }
  Object.assign(process.env, runtimeEnv);
}

async function main(cwd: string) {
  const next = require(resolveFrom(cwd, 'next'));
  const app = next({ dev: true, dir: cwd });
  const handler = app.getRequestHandler();

  const openPort = await getPort({
    port: [5000, 4000],
  });

  const url = `http://localhost:${openPort}`;

  // Prepare for incoming requests
  await app.prepare();

  syncRuntimeEnvVars();

  createServer((req, res) => {
    const parsedUrl = parse(req.url || '', true);
    handler(req, res, parsedUrl);
  }).listen(openPort, () => {
    if (process.send) {
      process.send(url);
    }
  });
}

main(process.cwd());
