const FileBlob = require('@now/build-utils/file-blob.js');
const FileFsRef = require('@now/build-utils/file-fs-ref.js');
const glob = require('@now/build-utils/fs/glob.js');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

async function patchLauncher({ documentRoot }) {
  const launcher = await FileBlob.fromStream({
    stream: new FileFsRef({
      fsPath: path.join(__dirname, 'launcher.js'),
    }).toStream(),
  });
  launcher.data = launcher.data
    .toString()
    .replace(/\/var\/task\/user/g, path.join('/var/task/user', documentRoot));
  return launcher;
}

function spawnAsync(command, args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'inherit', cwd });
    child.on('error', reject);
    child.on('close', (code, signal) => (code !== 0
      ? reject(new Error(`Exited with ${code || signal}`))
      : resolve()));
  });
}

async function getFiles({ documentRoot = '' }) {
  const files = await glob('native/**', __dirname);

  const phpConfig = await FileBlob.fromStream({
    stream: files['native/php.ini'].toStream(),
  });
  phpConfig.data = phpConfig.data
    .toString()
    .replace(/\/root\/app\/native\/modules/g, '/var/task/native/modules');
  files['native/php.ini'] = phpConfig;

  // Patch launcher with a custom documentRoot.
  files['launcher.js'] = await patchLauncher({ documentRoot });

  Object.assign(files, {
    'fastcgi/connection.js': new FileFsRef({
      fsPath: require.resolve('fastcgi-client/lib/connection.js'),
    }),
    'fastcgi/consts.js': new FileFsRef({
      fsPath: require.resolve('fastcgi-client/lib/consts.js'),
    }),
    'fastcgi/stringifykv.js': new FileFsRef({
      fsPath: require.resolve('fastcgi-client/lib/stringifykv.js'),
    }),
    'fastcgi/index.js': new FileFsRef({
      fsPath: path.join(__dirname, 'fastcgi/index.js'),
    }),
    'fastcgi/port.js': new FileFsRef({
      fsPath: path.join(__dirname, 'fastcgi/port.js'),
    }),
  });

  return files;
}

// Create a new php.ini in order to be use by the phpSpawn.
const phpNativesPath = path.resolve(__dirname, 'native');
const phpPath = path.join(phpNativesPath, 'php');
const phpIniPath = path.join(phpNativesPath, 'php.ini');
const phpModulesPath = path.join(path.dirname(phpIniPath), 'modules');

const phpIniData = fs
  .readFileSync(phpIniPath, 'utf-8')
  .replace(/\/root\/app\/native\/modules/g, phpModulesPath);

fs.writeFileSync(path.join(phpNativesPath, 'php-cli.ini'), phpIniData, 'utf-8');

async function phpSpawn({ args = [], workPath = phpNativesPath }) {
  return spawnAsync(
    phpPath,
    ['-c', path.join(phpNativesPath, 'php-cli.ini'), ...args],
    workPath,
  );
}

module.exports = {
  getFiles,
  phpSpawn,
};
