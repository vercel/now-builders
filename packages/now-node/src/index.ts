import { join, dirname, relative, resolve } from 'path';
import nodeFileTrace from '../node-file-trace/src/node-file-trace';
import {
  glob,
  download,
  File,
  FileBlob,
  FileFsRef,
  Files,
  Meta,
  createLambda,
  runNpmInstall,
  runPackageJsonScript,
  getNodeVersion,
  getSpawnOptions,
  PrepareCacheOptions,
  BuildOptions,
  shouldServe,
} from '@now/build-utils';
export { NowRequest, NowResponse } from './types';
import { makeLauncher } from './launcher';
import { readFile } from 'fs';

interface CompilerConfig {
  includeFiles?: string | string[];
}

interface DownloadOptions {
  files: Files;
  entrypoint: string;
  workPath: string;
  meta: Meta;
}

const LAUNCHER_FILENAME = '___now_launcher';
const BRIDGE_FILENAME = '___now_bridge';
const HELPERS_FILENAME = '___now_helpers';

async function downloadInstallAndBundle({
  files,
  entrypoint,
  workPath,
  meta,
}: DownloadOptions) {
  console.log('downloading user files...');
  const downloadedFiles = await download(files, workPath, meta);

  console.log("installing dependencies for user's code...");
  const entrypointFsDirname = join(workPath, dirname(entrypoint));
  const nodeVersion = await getNodeVersion(entrypointFsDirname);
  const spawnOpts = getSpawnOptions(meta, nodeVersion);
  await runNpmInstall(entrypointFsDirname, ['--prefer-offline'], spawnOpts);

  const entrypointPath = downloadedFiles[entrypoint].fsPath;
  return { entrypointPath, entrypointFsDirname, nodeVersion, spawnOpts };
}

async function compile(
  workPath: string,
  entrypointPath: string,
  entrypoint: string,
  config: CompilerConfig,
  { isDev, filesChanged, filesRemoved }: Meta
): Promise<{ preparedFiles: Files; watch: string[] }> {
  const inputFiles = new Set<string>(entrypointPath);
  const fsCache = new Map<string, File | null>();

  if (config && config.includeFiles) {
    const includeFiles =
      typeof config.includeFiles === 'string'
        ? [config.includeFiles]
        : config.includeFiles;

    for (const pattern of includeFiles) {
      const files = await glob(pattern, workPath);
      Object.keys(files).forEach(file => {
        const entry: FileFsRef = files[file];
        fsCache.set(file, entry);
        inputFiles.add(resolve(workPath, file));
      });
    }
  }

  const { fileList } = await nodeFileTrace([...inputFiles], {
    base: workPath,
    filterBase: true,
    ignore: config && (<any>config).excludeFiles,
    async readFile(path: string): Promise<Buffer | string | null> {
      const relPath = relative(workPath, path);
      const cached = fsCache.get(relPath);
      if (cached) {
        const stream = cached.toStream();
        const { data } = await FileBlob.fromStream({ stream });
        return data;
      }
      // null represents a not found
      if (cached === null) return null;
      try {
        const source = await new Promise<Buffer>((resolve, reject) =>
          readFile(path, (err, source) => (err ? reject(err) : resolve(source)))
        );
        // TODO: set file mode here
        fsCache.set(relPath, new FileBlob({ data: source }));
        return source;
      } catch (e) {
        if (e.code === 'ENOENT' || e.code === 'EISDIR') {
          fsCache.set(relPath, null);
          return null;
        }
        throw e;
      }
    },
  });

  console.log('Traced files:');
  console.log(JSON.stringify(fileList, null, 2));

  const preparedFiles: Files = {};
  fileList.forEach(path => {
    const entry = fsCache.get(path);
    if (!entry) throw new Error('Internal Error: Expected a file entry.');
    preparedFiles[path] = entry;
  });

  return {
    preparedFiles,
    watch: fileList,
  };
}

export const version = 2;

export const config = {
  maxLambdaSize: '5mb',
};

export async function build({
  files,
  entrypoint,
  workPath,
  config,
  meta = {},
}: BuildOptions) {
  const shouldAddHelpers = !(config && config.helpers === false);

  const {
    entrypointPath,
    entrypointFsDirname,
    nodeVersion,
    spawnOpts,
  } = await downloadInstallAndBundle({
    files,
    entrypoint,
    workPath,
    meta,
  });

  console.log('running user script...');
  await runPackageJsonScript(entrypointFsDirname, 'now-build', spawnOpts);

  console.log('tracing entrypoint file...');
  const { preparedFiles, watch } = await compile(
    workPath,
    entrypointPath,
    entrypoint,
    config,
    meta
  );

  const launcherFiles: Files = {
    [`${LAUNCHER_FILENAME}.js`]: new FileBlob({
      data: makeLauncher({
        entrypointPath: `./${entrypoint}`,
        bridgePath: `./${BRIDGE_FILENAME}`,
        helpersPath: `./${HELPERS_FILENAME}`,
        shouldAddHelpers,
      }),
    }),
    [`${BRIDGE_FILENAME}.js`]: new FileFsRef({
      fsPath: require('@now/node-bridge'),
    }),
  };

  if (shouldAddHelpers) {
    launcherFiles[`${HELPERS_FILENAME}.js`] = new FileFsRef({
      fsPath: join(__dirname, 'helpers.js'),
    });
  }

  // Use the system-installed version of `node` when running via `now dev`
  const runtime = meta.isDev ? 'nodejs' : nodeVersion.runtime;

  const lambda = await createLambda({
    files: {
      ...preparedFiles,
      ...launcherFiles,
    },
    handler: `${LAUNCHER_FILENAME}.launcher`,
    runtime,
  });

  const output = { [entrypoint]: lambda };
  const result = { output, watch };
  return result;
}

export { shouldServe };
