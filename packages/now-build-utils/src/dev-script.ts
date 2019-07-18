import path from 'path';
import { readFileSync } from 'fs';
import spawn from 'cross-spawn';
import getPort from 'get-port';
import { timeout } from 'promise-timeout';

import { BuildOptions, Route, PackageJson, Config } from './types';

const nowDevScriptPorts = new Map();

export const getRouteAtPort = (
  srcBase: string,
  devPort: number,
  route: Route
) => {
  const basic: Route = {
    src: `${srcBase}${route.src}`,
    dest: `http://localhost:${devPort}${route.dest}`,
  };

  if (route.headers) {
    basic.headers = route.headers;
  }

  return basic;
};

export function getCommand(pkg: PackageJson, cmd: string, config: Config) {
  // The `dev` script can be `now dev`
  const nowCmd = `now-${cmd}`;
  const { zeroConfig } = config;

  if (!zeroConfig && cmd === 'dev') {
    return nowCmd;
  }

  const scripts = (pkg && pkg.scripts) || {};

  if (scripts[nowCmd]) {
    return nowCmd;
  }

  if (scripts[cmd]) {
    return cmd;
  }

  return nowCmd;
}

export async function getDevRoute(buildOptions: BuildOptions) {
  const { entrypoint, workPath, config } = buildOptions;

  const mountpoint = path.dirname(entrypoint);
  const entrypointDir = path.join(workPath, mountpoint);

  const pkgPath = path.join(workPath, entrypoint);
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  const devScript = getCommand(pkg, 'dev', config as Config);

  /**
   *
   *
   */
  let devPort: number | undefined = nowDevScriptPorts.get(entrypoint);

  if (typeof devPort === 'number') {
    console.log('`%s` server already running for %j', devScript, entrypoint);
  } else {
    // Run the `now-dev` or `dev` script out-of-bounds, since it is assumed that
    // it will launch a dev server that never "completes"
    devPort = await getPort();
    nowDevScriptPorts.set(entrypoint, devPort);

    const opts = {
      cwd: entrypointDir,
      env: { ...process.env, PORT: String(devPort) },
    };

    const child = spawn('yarn', ['run', devScript], opts);
    child.on('exit', () => nowDevScriptPorts.delete(entrypoint));
    if (child.stdout) {
      child.stdout.setEncoding('utf8');
      child.stdout.pipe(process.stdout);
    }
    if (child.stderr) {
      child.stderr.setEncoding('utf8');
      child.stderr.pipe(process.stderr);
    }

    // Now wait for the server to have listened on `$PORT`, after which we
    // will ProxyPass any requests to that development server that come in
    // for this builder.
    try {
      await timeout(
        new Promise(resolve => {
          const checkForPort = (data: string) => {
            // Check the logs for the URL being printed with the port number
            // (i.e. `http://localhost:47521`).
            if (data.indexOf(`:${devPort}`) !== -1) {
              resolve();
            }
          };
          if (child.stdout) {
            child.stdout.on('data', checkForPort);
          }
          if (child.stderr) {
            child.stderr.on('data', checkForPort);
          }
        }),
        5 * 60 * 1000
      );
    } catch (err) {
      throw new Error(
        `Failed to detect a server running on port ${devPort}.\nDetails: https://err.sh/zeit/now-builders/now-static-build-failed-to-detect-a-server`
      );
    }

    console.log('Detected dev server for %j', entrypoint);
  }

  let srcBase = mountpoint.replace(/^\.\/?/, '');

  if (srcBase.length > 0) {
    srcBase = `/${srcBase}`;
  }

  return getRouteAtPort(srcBase, devPort, {
    src: '/(.*)',
    dest: '/$1',
  });
}
