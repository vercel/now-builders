const path = require('path');
const getPort = require('get-port');
const { promisify } = require('util');
const timeout = require('promise-timeout');
const { existsSync, readFileSync } = require('fs');
const waitForPort = promisify(require('wait-for-port'));
const {
  glob,
  download,
  runNpmInstall,
  runPackageJsonScript,
  runShellScript,
} = require('@now/build-utils'); // eslint-disable-line import/no-extraneous-dependencies

function validateDistDir(distDir) {
  const distDirName = path.basename(distDir);
  if (!existsSync(distDir)) {
    const message = `Build was unable to create the distDir: ${distDirName}.`
      + '\nMake sure you mentioned the correct dist directory: https://zeit.co/docs/v2/deployments/official-builders/static-build-now-static-build/#configuring-the-build-output-directory';
    throw new Error(message);
  }
}

exports.version = 2;

const nowDevScriptPromises = new Map();

exports.build = async ({
  files, entrypoint, workPath, config, meta = {},
}) => {
  console.log('downloading user files...');
  await download(files, workPath);

  const mountpoint = path.dirname(entrypoint);
  const entrypointFsDirname = path.join(workPath, mountpoint);
  const distPath = path.join(
    workPath,
    path.dirname(entrypoint),
    (config && config.distDir) || 'dist',
  );

  const entrypointName = path.basename(entrypoint);
  if (entrypointName === 'package.json') {
    await runNpmInstall(entrypointFsDirname, ['--prefer-offline']);

    const pkgPath = path.join(workPath, entrypoint);
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
    console.log({ pkg });

    if (meta.isDev && pkg.scripts && pkg.scripts['now-dev']) {
      if (nowDevScriptPromises.has(entrypoint)) {
        console.log('`now-dev` server already running for %j', entrypoint);
      } else {
        // Run the `now-dev` script out-of-bounds, since it is assumed that
        // it will launch a dev server that never "completes"
        const devPort = await getPort();
        console.log({ devPort });
        const opts = {
          env: { PORT: String(devPort) },
        };
        const promise = runPackageJsonScript(
          entrypointFsDirname,
          'now-dev',
          opts,
        );
        promise.then(
          () => {
            nowDevScriptPromises.delete(entrypoint);
          },
          (err) => {
            console.log('`now-dev` script error:', err);
            nowDevScriptPromises.delete(entrypoint);
          },
        );
        nowDevScriptPromises.set(entrypoint, promise);

        // Now wait for the server to have listened on `$PORT`. This assumes that
        // the dev server builds the static assets before binding to the port.
        await timeout(waitForPort('localhost', devPort), 60 * 1000);
        console.log('Detected dev server for $j', entrypoint);
      }
    } else {
      // Run the `now-build` script and wait for completion to collect the build
      // outputs
      console.log('running user "now-build" script from `package.json`...');
      if (!(await runPackageJsonScript(entrypointFsDirname, 'now-build'))) {
        throw new Error(
          `An error running "now-build" script in "${entrypoint}"`,
        );
      }
    }
    validateDistDir(distPath);
    const routes = [];
    const watch = path.join(entrypointFsDirname, '**/*');
    const output = await glob('**', distPath, mountpoint);
    return { routes, watch, output };
  }

  if (path.extname(entrypoint) === '.sh') {
    await runShellScript(path.join(workPath, entrypoint));
    validateDistDir(distPath);
    return glob('**', distPath, mountpoint);
  }

  throw new Error('Proper build script must be specified as entrypoint');
};
