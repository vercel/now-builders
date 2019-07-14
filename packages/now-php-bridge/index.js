const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const { promisify } = require('util');
const { runNpmInstall, glob, download } = require('@now/build-utils');
const { getFiles: getCgiFiles } = require('./launchers/cgi');
const { getFiles: getServerFiles } = require('./launchers/server');
const configuration = require('./config');

const writeFile = promisify(fs.writeFile);

function getPhpPkg({ workPath, config }) {
  return `${workPath}/node_modules/${configuration.getPhpNpm(config)}`;
}

async function installPhp({ workPath, config }) {
  console.log(`🐘 Installing PHP ${configuration.getVersion(config)} lib.`);

  // Install defined PHP version on the fly into the tmp folder
  const packageJson = {
    dependencies: {
      [configuration.getPhpNpm(config)]: 'canary',
    },
  };

  const packageJsonPath = path.join(workPath, 'package.json');
  await writeFile(packageJsonPath, JSON.stringify(packageJson));

  await runNpmInstall(path.dirname(packageJsonPath), [
    '--prod',
    '--prefer-offline',
  ]);

  console.log(`🐘 Installing PHP ${configuration.getVersion(config)} lib OK.`);
}

async function getPhpFiles({ workPath, config }) {
  await installPhp({ workPath, config });

  // Resolve dynamically installed PHP lib package in tmp folder
  const phpPkg = getPhpPkg({ workPath, config });
  const phpLibPkg = require(phpPkg);

  // Every PHP version MUST have getFiles method!
  const files = await phpLibPkg.getFiles();
  const mode = configuration.getMode(config);

  if (mode === 'server') {
    delete files['php/php-cgi'];
    delete files['php/php-fpm'];
    delete files['php/php-fpm.ini'];
  } else if (mode === 'cgi') {
    delete files['php/php'];
    delete files['php/php-fpm'];
    delete files['php/php-fpm.ini'];
  } else {
    throw new Error(
      `Invalid config.mode "${
        config.mode
      }" given. Supported modes are server|cgi.`,
    );
  }

  return files;
}

function getLauncherFiles(config) {
  const mode = configuration.getMode(config);

  switch (mode) {
    case 'server':
      return getServerFiles();
    case 'cgi':
      return getCgiFiles();
    default:
      throw new Error(
        `Invalid config.mode "${
          config.mode
        }" given. Supported modes are server|cgi.`,
      );
  }
}

async function getIncludedFiles({
  files, entrypoint, workPath, config, meta,
}) {
  // Download all files to workPath
  const downloadedFiles = await download(files, workPath, meta);

  let includedFiles = {};
  if (config && config.includeFiles) {
    // Find files for each glob
    // eslint-disable-next-line no-restricted-syntax
    for (const pattern of config.includeFiles) {
      // eslint-disable-next-line no-await-in-loop
      const matchedFiles = await glob(pattern, workPath);
      Object.assign(includedFiles, matchedFiles);
    }
    // explicit and always include the entrypoint
    Object.assign(includedFiles, {
      [entrypoint]: files[entrypoint],
    });
  } else {
    // Backwards compatibility
    includedFiles = downloadedFiles;
  }

  return includedFiles;
}

function spawnAsync(command, args, cwd, opts = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      cwd,
      ...opts,
    });

    child.on('error', reject);
    child.on('exit', (code, signal) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Exited with ${code || signal}`));
      }
    });
  });
}

async function runPhp({ workPath, config }, args) {
  const phpPkg = getPhpPkg({ workPath, config });
  const phpDir = path.join(phpPkg, 'php');
  const libDir = path.join(phpPkg, 'lib');

  try {
    await spawnAsync(
      'php',
      [`-dextension_dir=${phpDir}/modules`, ...args],
      workPath,
      {
        env: {
          COMPOSER_HOME: '/tmp',
          PATH: `${phpDir}:${process.env.PATH}`,
          LD_LIBRARY_PATH: `${libDir}:/usr/lib64:/lib64:${
            process.env.LD_LIBRARY_PATH
          }`,
        },
      },
    );
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

async function runComposerInstall({ workPath, config }) {
  const pkgDir = getPhpPkg({ workPath, config });
  const phpDir = path.join(pkgDir, 'php');

  await runPhp({ workPath, config }, [
    `-dextension_dir=${phpDir}/modules`,
    `${phpDir}/composer`,
    'install',
    '--profile',
    '--no-dev',
    '--no-interaction',
    '--no-scripts',
    '--ignore-platform-reqs',
  ]);
}

async function getComposerFiles({ workPath, config }) {
  if (!config || config.composer !== true) {
    console.log('🐘 Skip Composer (config.composer not provided)');
    return [];
  }

  if (configuration.getVersion(config) === '7.4') {
    console.log(
      '🐘 Skip Composer (calling PHP 7.4 is not supported at this moment)',
    );
    return [];
  }

  // Install composer dependencies
  console.log('🐘 Installing Composer deps.');
  await runComposerInstall({ workPath, config });
  console.log('🐘 Installing Composer deps OK.');

  // Find vendor files
  const files = await glob('vendor/**', workPath);

  return files;
}

function getRuntime(config) {
  return configuration.getRuntime(config);
}

module.exports = {
  getPhpFiles,
  getLauncherFiles,
  getIncludedFiles,
  getComposerFiles,
  getRuntime,
  // Special functions!
  installPhp,
  runComposerInstall,
  runPhp,
};

// (async () => {
//   await runComposerInstall(process.env.NOW_PHP);
// })();
