import { join, dirname, relative, sep } from 'path';
import { readFile } from 'fs-extra';
import {
  glob,
  download,
  FileBlob,
  FileFsRef,
  Files,
  createLambda,
  runNpmInstall,
  runPackageJsonScript,
  PrepareCacheOptions,
  Meta,
  BuildOptions,
  shouldServe
} from '@now/build-utils';
import { BuildAssets } from './types';
import { watcherBuild } from './watcher';
const ncc = require('@zeit/ncc');

interface CompilerConfig {
  includeFiles?: string[];
}

interface DownloadOptions {
  files: Files,
  entrypoint: string;
  workPath: string;
  npmArguments?: string[];
}

async function downloadInstallAndBundle({
  files,
  entrypoint,
  workPath,
  npmArguments = []
}: DownloadOptions) {
  console.log('downloading user files...');
  const downloadedFiles = await download(files, workPath);

  console.log("installing dependencies for user's code...");
  const entrypointFsDirname = join(workPath, dirname(entrypoint));
  await runNpmInstall(entrypointFsDirname, npmArguments);

  const entrypointPath = downloadedFiles[entrypoint].fsPath;
  return { entrypointPath, entrypointFsDirname };
}

async function compile(
  entrypointPath: string,
  entrypoint: string,
  config: CompilerConfig,
  workPath: string,
  { isDev, filesChanged = [], filesRemoved = [] }: Meta
): Promise<{ preparedFiles: Files, watch: string[] }> {
  const input = entrypointPath;
  const inputDir = dirname(input);
  const rootIncludeFiles = inputDir.split(sep).pop() || '';
  const nccOptions = { sourceMap: true, sourceMapRegister: true };

  let code: string;
  let map: string | void;
  let assets: BuildAssets = {};
  let watch: string[] = [];

  if (isDev) {
    const workPathFilesChanged = filesChanged.map(f => join(workPath, f));
    const workPathFilesRemoved = filesRemoved.map(f => join(workPath, f));
    console.error({
      input,
      nccOptions,
      workPathFilesChanged,
      workPathFilesRemoved});
    ({ code, map, assets, watch } = await watcherBuild(
      input,
      nccOptions,
      workPathFilesChanged,
      workPathFilesRemoved));
  } else {
    ({ code, map, assets } = await ncc(input, nccOptions));
  }

  if (config && config.includeFiles) {
    for (const pattern of config.includeFiles) {
      const files = await glob(pattern, inputDir);

      for (const assetName of Object.keys(files)) {
        const stream = files[assetName].toStream();
        const { mode } = files[assetName];
        const { data } = await FileBlob.fromStream({ stream });
        let fullPath = join(rootIncludeFiles, assetName);

        // if asset contain directory
        // no need to use `rootIncludeFiles`
        if (assetName.includes(sep)) {
          fullPath = assetName
        }

        assets[fullPath] = {
          source: data,
          permissions: mode
        };
      }
    }
  }

  const preparedFiles: Files = {};
  // move all user code to 'user' subdirectory
  preparedFiles[entrypoint] = new FileBlob({ data: code });
  if (map) {
    preparedFiles[`${entrypoint.replace('.ts', '.js')}.map`] = new FileBlob({ data: map });
  }
  // eslint-disable-next-line no-restricted-syntax
  for (const assetName of Object.keys(assets)) {
    const { source: data, permissions: mode } = assets[assetName];
    const blob2 = new FileBlob({ data, mode });
    preparedFiles[join(dirname(entrypoint), assetName)] = blob2;
  }

  return { preparedFiles, watch };
}

// Declare that `@now/node` implements the Builder v2 API
export const version = 2;

export const config = {
  maxLambdaSize: '5mb'
};

export async function build({ files, entrypoint, workPath, config, meta = {} }: BuildOptions) {
  const {
    entrypointPath,
    entrypointFsDirname
  } = await downloadInstallAndBundle(
    { files, entrypoint, workPath, npmArguments: ['--prefer-offline'] }
  );

  console.log('running user script...');
  await runPackageJsonScript(entrypointFsDirname, 'now-build');

  console.log('compiling entrypoint with ncc...');
  const { preparedFiles, watch } = await compile(
    entrypointPath,
    entrypoint,
    config,
    workPath,
    meta
  );
  const launcherPath = join(__dirname, 'launcher.js');
  let launcherData = await readFile(launcherPath, 'utf8');

  launcherData = launcherData.replace(
    '// PLACEHOLDER',
    [
      `listener = require("./${entrypoint}");`,
      'if (listener.default) listener = listener.default;'
    ].join(' ')
  );

  const launcherFiles = {
    'launcher.js': new FileBlob({ data: launcherData }),
    'bridge.js': new FileFsRef({ fsPath: require('@now/node-bridge') })
  };

  const lambda = await createLambda({
    files: { ...preparedFiles, ...launcherFiles },
    handler: 'launcher.launcher',
    runtime: 'nodejs8.10'
  });

  const output = { [entrypoint]: lambda };
  return { output, watch: watch.map(f => relative(workPath, f)) };
}

export async function prepareCache({ workPath }: PrepareCacheOptions) {
  return {
    ...(await glob('node_modules/**', workPath)),
    ...(await glob('package-lock.json', workPath)),
    ...(await glob('yarn.lock', workPath))
  };
}

export { shouldServe };
