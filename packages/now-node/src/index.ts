import { basename, dirname, join, relative, resolve, sep } from 'path';
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
import { readFileSync, lstatSync, readlinkSync } from 'fs';
import { Compile } from './typescript';

interface CompilerConfig {
  debug?: boolean;
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
const SOURCEMAP_SUPPORT_FILENAME = '__sourcemap_support';

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
): Promise<{
  preparedFiles: Files;
  shouldAddSourcemapSupport: boolean;
  watch: string[];
}> {
  const inputFiles = new Set<string>([entrypointPath]);

  const sourceCache = new Map<string, string | Buffer | null>();
  const fsCache = new Map<string, File>();
  const tsCompiled = new Set<String>();

  let shouldAddSourcemapSupport = false;

  if (config.includeFiles) {
    const includeFiles =
      typeof config.includeFiles === 'string'
        ? [config.includeFiles]
        : config.includeFiles;

    for (const pattern of includeFiles) {
      const files = await glob(pattern, workPath);
      await Promise.all(
        Object.keys(files).map(async file => {
          const entry: FileFsRef = files[file];
          fsCache.set(file, entry);
          const stream = entry.toStream();
          const { data } = await FileBlob.fromStream({ stream });
          if (file.endsWith('.ts')) {
            sourceCache.set(
              file,
              compileTypeScript(resolve(workPath, file), data.toString())
            );
          } else {
            sourceCache.set(file, data);
          }
          inputFiles.add(resolve(workPath, file));
        })
      );
    }
  }

  if (config.debug) {
    console.log(
      'tracing input files: ' +
        [...inputFiles].map(p => relative(workPath, p)).join(', ')
    );
  }

  const preparedFiles: Files = {};

  let tsCompile: Compile;
  function compileTypeScript(path: string, source: string): string {
    const relPath = relative(workPath, path);
    if (config.debug) {
      console.log('compiling typescript file ' + relPath);
    }
    if (!tsCompile) {
      tsCompile = require('./typescript').init({
        basePath: workPath,
        logError: true,
      });
    }
    try {
      var { code, map } = tsCompile(source, path);
    } catch (e) {
      if (config.debug) {
        console.error(e);
        console.log(
          'TypeScript compilation failed, falling back to basic transformModule'
        );
      }
      // If TypeScript compile fails, attempt a direct non-typecheck compile
      var { code, map } = tsCompile(source, path, true);
    }
    tsCompiled.add(relPath);
    preparedFiles[relPath.slice(0, -3) + '.js.map'] = new FileBlob({
      data: JSON.stringify(map),
    });
    source = code;
    shouldAddSourcemapSupport = true;
    return source;
  }

  const { fileList, esmFileList } = await nodeFileTrace([...inputFiles], {
    base: workPath,
    filterBase: true,
    ts: true,
    ignore: config.excludeFiles,
    readFile(path: string): Buffer | string | null {
      const relPath = relative(workPath, path);
      const cached = sourceCache.get(relPath);
      if (cached) return cached.toString();
      // null represents a not found
      if (cached === null) return null;
      try {
        let source: string | Buffer = readFileSync(path);
        if (path.endsWith('.ts')) {
          source = compileTypeScript(path, source.toString());
        }
        const stats = lstatSync(path);
        let entry: File;
        if (stats.isSymbolicLink()) {
          entry = new FileFsRef({ mode: stats.mode, fsPath: path });
        } else {
          entry = new FileBlob({ data: source, mode: stats.mode });
        }
        fsCache.set(relPath, entry);
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

  if (config.debug) {
    console.log('traced files:');
    console.log('\t' + fileList.join('\n\t'));
  }

  for (const path of fileList) {
    let entry = fsCache.get(path);
    if (!entry) {
      const resolved = resolve(workPath, path);
      const stats = lstatSync(resolved);
      if (stats.isSymbolicLink()) {
        entry = new FileFsRef({ mode: stats.mode, fsPath: resolved });
      } else {
        const source = readFileSync(resolved);
        entry = new FileBlob({ data: source, mode: stats.mode });
      }
    }
    // ensure symlink targets are added to the file list
    if (entry.mode && entry.fsPath && entry.mode >> 12 === 10) {
      // ensure the symlink target is added to the file list
      const symlinkTarget = relative(
        workPath,
        resolve(dirname(entry.fsPath), readlinkSync(entry.fsPath))
      );
      if (
        !symlinkTarget.startsWith('..' + sep) &&
        fileList.indexOf(symlinkTarget) === -1
      )
        fileList.push(symlinkTarget);
    }
    // Rename .ts -> .js (except for entry)
    if (path !== entrypoint && tsCompiled.has(path)) {
      preparedFiles[path.slice(0, -3) + '.js'] = entry;
    } else preparedFiles[path] = entry;
  }

  // Compile ES Modules into CommonJS
  const esmPaths = esmFileList.filter(
    file => !file.endsWith('.ts') && !file.match(libPathRegEx)
  );
  if (esmPaths.length) {
    const babelCompile = require('./babel').compile;
    for (const path of esmPaths) {
      if (config.debug) {
        console.log('compiling es module file ' + path);
      }

      const filename = basename(path);
      const { data: source } = await FileBlob.fromStream({
        stream: preparedFiles[path].toStream(),
      });

      const { code, map } = babelCompile(filename, source);
      shouldAddSourcemapSupport = true;
      preparedFiles[path] = new FileBlob({
        data: `${code}\n//# sourceMappingURL=${filename}.map`,
      });
      delete map.sourcesContent;
      preparedFiles[path + '.map'] = new FileBlob({
        data: JSON.stringify(map),
      });
    }
  }

  return {
    preparedFiles,
    shouldAddSourcemapSupport,
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
  config = {},
  meta = {},
}: BuildOptions) {
  const shouldAddHelpers = config.helpers !== false;

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

  console.log('tracing input files...');
  const { preparedFiles, shouldAddSourcemapSupport, watch } = await compile(
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
        sourcemapSupportPath: `./${SOURCEMAP_SUPPORT_FILENAME}`,
        shouldAddHelpers,
        shouldAddSourcemapSupport,
      }),
    }),
    [`${BRIDGE_FILENAME}.js`]: new FileFsRef({
      fsPath: require('@now/node-bridge'),
    }),
  };

  if (shouldAddSourcemapSupport) {
    launcherFiles[`${SOURCEMAP_SUPPORT_FILENAME}.js`] = new FileFsRef({
      fsPath: join(__dirname, 'source-map-support.js'),
    });
  }

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

export async function prepareCache({ workPath }: PrepareCacheOptions) {
  return {
    ...(await glob('node_modules/**', workPath)),
    ...(await glob('package-lock.json', workPath)),
    ...(await glob('yarn.lock', workPath)),
  };
}

export { shouldServe };
