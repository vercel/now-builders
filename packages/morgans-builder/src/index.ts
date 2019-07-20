import path from 'path';
import { existsSync, readFileSync, statSync, readdirSync } from 'fs';
import {
  glob,
  download,
  runNpmInstall,
  runPackageJsonScript,
  getNodeVersion,
  getSpawnOptions,
  Files,
  Route,
  BuildOptions,
  Config,
  getCommand,
  getDevRoute,
} from '@morgs32/build-utils';

// @ts-ignore
import { build as nodeBuild } from '@now/node';

function validateDistDir(distDir: string, isDev: boolean | undefined) {
  const hash = isDev
    ? '#local-development'
    : '#configuring-the-build-output-directory';
  const docsUrl = `https://zeit.co/docs/v2/deployments/official-builders/static-build-now-static-build${hash}`;
  const distDirName = path.basename(distDir);
  if (!existsSync(distDir)) {
    const message =
      `Build was unable to create the distDir: "${distDirName}".` +
      `\nMake sure you configure the the correct distDir: ${docsUrl}`;
    throw new Error(message);
  }
  const stat = statSync(distDir);
  if (!stat.isDirectory()) {
    const message =
      `Build failed because distDir is not a directory: "${distDirName}".` +
      `\nMake sure you configure the the correct distDir: ${docsUrl}`;
    throw new Error(message);
  }

  const contents = readdirSync(distDir);
  if (contents.length === 0) {
    const message =
      `Build failed because distDir is empty: "${distDirName}".` +
      `\nMake sure you configure the the correct distDir: ${docsUrl}`;
    throw new Error(message);
  }
}

export const version = 2;

export async function build(buildOptions: BuildOptions) {
  const { files, entrypoint, workPath, config, meta = {} } = buildOptions;

  console.log('Downloading user files...');
  await download(files, workPath, meta);

  const mountpoint = path.dirname(entrypoint);
  const entrypointDir = path.join(workPath, mountpoint);

  let distPath = path.join(
    workPath,
    path.dirname(entrypoint),
    (config && (config.distDir as string)) || 'dist'
  );

  const entrypointName = path.basename(entrypoint);

  if (entrypointName === 'package.json') {
    const pkgPath = path.join(workPath, entrypoint);
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));

    let output: Files = {};
    let minNodeRange: string | undefined = undefined;

    const devScript = getCommand(pkg, 'dev', config as Config);

    const nodeVersion = await getNodeVersion(entrypointDir, minNodeRange);
    const spawnOpts = getSpawnOptions(meta, nodeVersion);

    await runNpmInstall(entrypointDir, ['--prefer-offline'], spawnOpts);

    if (meta.isDev && pkg.scripts && pkg.scripts[devScript]) {
      const route: Route = await getDevRoute(buildOptions);

      /**
       * We are done
       */
      const watch = [path.join(mountpoint.replace(/^\.\/?/, ''), '**/*')];
      return {
        routes: [route],
        watch,
        output,
      };
    } else {
      if (meta.isDev) {
        console.log(`WARN: "${devScript}" script is missing from package.json`);
        console.log(
          'See the local development docs: https://zeit.co/docs/v2/deployments/official-builders/static-build-now-static-build/#local-development'
        );
      }

      const buildScript = getCommand(pkg, 'build', config as Config);
      console.log(`Running "${buildScript}" script in "${entrypoint}"`);

      const found = await runPackageJsonScript(
        entrypointDir,
        buildScript,
        spawnOpts
      );

      if (!found) {
        throw new Error(
          `Missing required "${buildScript}" script in "${entrypoint}"`
        );
      }

      validateDistDir(distPath, meta.isDev);

      if (!pkg.main) {
        throw new Error('WARN: "main" file is missing from package.json');
      }

      const serverPath = path.join(entrypointDir, pkg.main);

      const nodeConfig = {
        ...buildOptions,
        config: {},
        entrypoint: serverPath,
      };

      console.log('fsPath', serverPath);
      // @ts-ignore
      const nodeResults = await nodeBuild(nodeConfig);

      console.log('nodeResults', nodeResults);

      output = {
        ...(await glob('**', distPath, mountpoint)),
        ...nodeResults.output,
      };

      const watch = [...nodeResults.watch];

      /**
       *
       *
       */
      if (!config.distRoutes || !Array.isArray(config.distRoutes)) {
        throw new Error('WARN: distRoutes is either missing or not an array');
      }
      // @ts-ignore
      const routes = config.distRoutes || [];
      return { routes, output, watch };
    }
  }

  const message = `Build "src" is "${entrypoint}" but expected "package.json"`;
  throw new Error(message);
}
