import path from 'path';
import { existsSync, readFileSync, statSync, readdirSync } from 'fs';
import frameworks from './frameworks';
import {
  glob,
  download,
  runNpmInstall,
  runPackageJsonScript,
  runShellScript,
  getNodeVersion,
  getSpawnOptions,
  Files,
  Route,
  BuildOptions,
  Config,
  getCommand,
  getDevRoute,
} from '@now/build-utils';

interface Framework {
  name: string;
  dependency: string;
  getOutputDirName: (dirPrefix: string) => Promise<string>;
  defaultRoutes?: Route[];
  minNodeRange?: string;
}

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
    let framework: Framework | undefined = undefined;
    let minNodeRange: string | undefined = undefined;

    const routes: Route[] = [];
    const devScript = getCommand(pkg, 'dev', config as Config);

    if (config.zeroConfig) {
      const dependencies = Object.assign(
        {},
        pkg.dependencies,
        pkg.devDependencies
      );

      framework = frameworks.find(({ dependency }) => dependencies[dependency]);
    }

    if (framework) {
      console.log(
        `Detected ${framework.name} framework. Optimizing your deployment...`
      );

      if (framework.minNodeRange) {
        minNodeRange = framework.minNodeRange;
        console.log(
          `${framework.name} requires Node.js ${
            framework.minNodeRange
          }. Switching...`
        );
      } else {
        console.log(
          `${
            framework.name
          } does not require a specific Node.js version. Continuing ...`
        );
      }
    }

    const nodeVersion = await getNodeVersion(entrypointDir, minNodeRange);
    const spawnOpts = getSpawnOptions(meta, nodeVersion);

    await runNpmInstall(entrypointDir, ['--prefer-offline'], spawnOpts);

    if (meta.isDev && pkg.scripts && pkg.scripts[devScript]) {
      if (framework && framework.defaultRoutes) {
        // We need to delete the routes for `now dev`
        // since in this case it will get proxied to
        // a custom server we don't have control over
        delete framework.defaultRoutes;
      }

      routes.push(await getDevRoute(buildOptions));
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

      if (framework) {
        const outputDirPrefix = path.join(workPath, path.dirname(entrypoint));
        const outputDirName = await framework.getOutputDirName(outputDirPrefix);

        distPath = path.join(outputDirPrefix, outputDirName);
      }

      validateDistDir(distPath, meta.isDev);
      output = await glob('**', distPath, mountpoint);

      if (framework && framework.defaultRoutes) {
        routes.push(...framework.defaultRoutes);
      }
    }

    const watch = [path.join(mountpoint.replace(/^\.\/?/, ''), '**/*')];
    return { routes, watch, output };
  }

  if (!config.zeroConfig && entrypointName.endsWith('.sh')) {
    console.log(`Running build script "${entrypoint}"`);
    const nodeVersion = await getNodeVersion(entrypointDir);
    const spawnOpts = getSpawnOptions(meta, nodeVersion);
    await runShellScript(path.join(workPath, entrypoint), [], spawnOpts);
    validateDistDir(distPath, meta.isDev);

    return glob('**', distPath, mountpoint);
  }

  let message = `Build "src" is "${entrypoint}" but expected "package.json"`;

  if (!config.zeroConfig) {
    message += ' or "build.sh"';
  }

  throw new Error(message);
}
