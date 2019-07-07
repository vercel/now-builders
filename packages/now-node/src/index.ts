import { basename, dirname, join, relative, resolve } from 'path';
import nodeFileTrace from '@zeit/node-file-trace';
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
import { readFileSync } from 'fs';

interface CompilerConfig {
  includeFiles?: string | string[];
  excludeFiles?: string | string[];
}

interface DownloadOptions {
  files: Files;
  entrypoint: string;
  workPath: string;
  meta: Meta;
}

const libPathRegEx = /^node_modules|[\/\\]node_modules[\/\\]/;

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
  const inputDir = dirname(entrypointPath);
  const inputFiles = new Set<string>([entrypointPath]);

  const sourceCache = new Map<string, string | Buffer | null>();
  const fsCache = new Map<string, File>();

  if (config && config.includeFiles) {
    const includeFiles =
      typeof config.includeFiles === 'string'
        ? [config.includeFiles]
        : config.includeFiles;

    for (const pattern of includeFiles) {
      const files = await glob(pattern, inputDir);
      await Promise.all(
        Object.keys(files).map(async file => {
          const entry: FileFsRef = files[file];
          fsCache.set(file, entry);
          const stream = entry.toStream();
          const { data } = await FileBlob.fromStream({ stream });
          sourceCache.set(file, data);
          inputFiles.add(resolve(workPath, file));
        })
      );
    }
  }

  console.log('tracing input files: ' + [...inputFiles].join(', '));

  const { fileList, esmFileList } = await nodeFileTrace([...inputFiles], {
    base: workPath,
    filterBase: true,
    ignore: config && config.excludeFiles,
    readFile(path: string): Buffer | string | null {
      const relPath = relative(workPath, path);
      const cached = sourceCache.get(relPath);
      if (cached) return cached.toString();
      // null represents a not found
      if (cached === null) return null;
      try {
        const source = readFileSync(path);
        // TODO: set file mode here
        fsCache.set(relPath, new FileBlob({ data: source }));
        sourceCache.set(relPath, source);
        return source.toString();
      } catch (e) {
        if (e.code === 'ENOENT' || e.code === 'EISDIR') {
          sourceCache.set(relPath, null);
          return null;
        }
        throw e;
      }
    },
  });

  console.log('traced files:');
  console.log('\t' + fileList.join('\n\t'));

  const preparedFiles: Files = {};
  for (const path of fileList) {
    let entry = fsCache.get(path);
    // TODO: handle symlinks here
    if (!entry) {
      const source = readFileSync(resolve(workPath, path));
      entry = new FileBlob({ data: source });
    }
    preparedFiles[path] = entry;
  }

  // Compile TypeScript files
  const tsPaths = Object.keys(preparedFiles).filter(
    file => file.endsWith('.ts') && !file.match(libPathRegEx)
  );
  if (tsPaths.length) {
    const typescript = require('typescript');
    for (const path of tsPaths) {
      console.log('compiling typescript file ' + path);

      const { data: source } = await FileBlob.fromStream({
        stream: preparedFiles[path].toStream(),
      });
    }
  }

  // Compile ES Modules into CommonJS
  const esmPaths = esmFileList.filter(
    file => !file.endsWith('.ts') && !file.match(libPathRegEx)
  );
  if (esmPaths.length) {
    const babel = require('@babel/core');
    const pluginTransformModulesCommonJs = require('@babel/plugin-transform-modules-commonjs');

    for (const path of esmPaths) {
      console.log('compiling es module file ' + path);

      const { data: source } = await FileBlob.fromStream({
        stream: preparedFiles[path].toStream(),
      });
      const filename = basename(path);
      try {
        const { code, map } = babel.transform(source, {
          filename,
          babelrc: false,
          highlightCode: false,
          compact: false,
          sourceType: 'module',
          sourceMaps: true,
          parserOpts: {
            plugins: [
              'asyncGenerators',
              'classProperties',
              'classPrivateProperties',
              'classPrivateMethods',
              'optionalCatchBinding',
              'objectRestSpread',
              'numericSeparator',
              'dynamicImport',
              'importMeta',
            ],
          },
          plugins: [pluginTransformModulesCommonJs],
        });
        preparedFiles[path] = new FileBlob({
          data: `${code}\n//# sourceMappingURL=${filename}.map`,
        });
        preparedFiles[path + '.map'] = new FileBlob({
          data: JSON.stringify(map),
        });
      } catch (e) {}
    }
  }

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
