const {
  createLambda,
  download,
  FileBlob,
  FileFsRef,
  glob,
  runNpmInstall,
  runPackageJsonScript,
  shouldServe,
} = require('@now/build-utils');
const { readFileSync, realpathSync, statSync } = require('fs');
const { dirname, join, relative } = require('path');

function withErrorLog(fn) {
  return async function wrapped(...args) {
    try {
      return await fn.apply(this, args);
    } catch (err) {
      console.error(err);
      throw err;
    }
  };
}

async function resolveFiles(workPath, entrypoint, config = {}) {
  const { resolve } = require('resolve-dependencies');

  // resolve symlink
  const realWorkPath = realpathSync(workPath);

  const resolved = await resolve(join(realWorkPath, entrypoint));
  const resolvedFiles = {};

  [...Object.values(resolved.files)].forEach((file) => {
    const name = relative(realWorkPath, file.absPath);
    if (resolvedFiles[name]) return;

    const { mode } = statSync(file.absPath);
    resolvedFiles[name] = new FileBlob({ data: file.contents, mode });
  });

  if (config.includeFiles) {
    const includeFiles = typeof config.includeFiles === 'string'
      ? [config.includeFiles]
      : config.includeFiles;

    await Promise.all(
      includeFiles.map(async (pattern) => {
        const files = await glob(pattern, realWorkPath);

        [...Object.entries(files)].forEach(([name, file]) => {
          if (!resolvedFiles[name]) {
            resolvedFiles[name] = file;
          }
        });
      }),
    );
  }

  return resolvedFiles;
}

exports.config = {
  maxLambdaSize: '5mb',
};

exports.build = withErrorLog(
  async ({
    files, entrypoint, workPath, config, meta,
  }) => {
    console.log('downloading...');
    await download(files, workPath, meta);

    let basename = entrypoint;

    // install all node_modules including parent directories.
    while (basename !== '.') {
      basename = dirname(basename);
      const dir = join(workPath, basename);

      console.log(`installing dependencies on "${basename}"...`);
      // eslint-disable-next-line no-await-in-loop
      await runNpmInstall(dir, ['--prefer-offline']);

      console.log(`executing now-build script on "${basename}"...`);
      // eslint-disable-next-line no-await-in-loop
      await runPackageJsonScript(dir, 'now-build');
    }

    console.log('resolving...');
    const resolvedFiles = await resolveFiles(workPath, entrypoint, config);

    console.log('creating lambda...');
    const launcherPath = join(__dirname, 'launcher.js');
    let launcherData = readFileSync(launcherPath, 'utf8');

    launcherData = launcherData.replace(
      '// PLACEHOLDER',
      [
        `handler = require("./${entrypoint}");`,
        'if (handler.default) handler = handler.default;',
      ].join(' '),
    );

    const launcherFiles = {
      'launcher.js': new FileBlob({ data: launcherData }),
      'bridge.js': new FileFsRef({ fsPath: require('@now/node-bridge') }),
    };

    const lambda = await createLambda({
      files: {
        ...resolvedFiles,
        ...launcherFiles,
      },
      handler: 'launcher.launcher',
      runtime: 'nodejs8.10',
    });

    return { [entrypoint]: lambda };
  },
);

exports.prepareCache = async function prepareCache({ workPath }) {
  return {
    ...(await glob('**/node_modules/**', workPath)),
    ...(await glob('**/package-lock.json', workPath)),
    ...(await glob('**/yarn.lock', workPath)),
  };
};

exports.shouldServe = shouldServe;
