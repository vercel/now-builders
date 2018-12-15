const { createLambda } = require('@now/build-utils/lambda.js');
const FileBlob = require('@now/build-utils/file-blob.js');
const FileFsRef = require('@now/build-utils/file-fs-ref.js');
const glob = require('@now/build-utils/fs/glob.js');
const path = require('path');
const rename = require('@now/build-utils/fs/rename.js');
const { spawnSync } = require('child_process');

exports.config = {
  maxLambdaSize: '20mb',
};

exports.build = async ({ files, entrypoint }) => {
  // move all user code to 'user' subdirectory
  const userFiles = rename(files, name => path.join('user', name));
  const nativeFiles = await glob('native/**', __dirname);

  const fpmConfig = await FileBlob.fromStream({ stream: nativeFiles['native/fpm.ini'].toStream() });
  fpmConfig.data = fpmConfig.data.toString()
    .replace('$chroot', '/var/task/user')
    .replace('$user', spawnSync('whoami', [], { stdio: 'pipe' }).stdout.toString().trim());
  nativeFiles['native/fpm.ini'] = fpmConfig;

  const phpConfig = await FileBlob.fromStream({ stream: nativeFiles['native/php.ini'].toStream() });
  phpConfig.data = phpConfig.data.toString()
    .replace(/\/root\/app\/modules/g, '/var/task/native/modules');
  nativeFiles['native/php.ini'] = phpConfig;

  const launcherFiles = {
    'fastcgi/connection.js': new FileFsRef({ fsPath: require.resolve('fastcgi-client/lib/connection.js') }),
    'fastcgi/consts.js': new FileFsRef({ fsPath: require.resolve('fastcgi-client/lib/consts.js') }),
    'fastcgi/stringifykv.js': new FileFsRef({ fsPath: require.resolve('fastcgi-client/lib/stringifykv.js') }),
    'fastcgi/index.js': new FileFsRef({ fsPath: path.join(__dirname, 'fastcgi/index.js') }),
    'launcher.js': new FileFsRef({ fsPath: path.join(__dirname, 'launcher.js') }),
    'bridge.js': new FileFsRef({ fsPath: path.join(__dirname, 'bridge.js') }),
    'port.js': new FileFsRef({ fsPath: path.join(__dirname, 'port.js') }),
  };

  const lambda = await createLambda({
    files: { ...userFiles, ...nativeFiles, ...launcherFiles },
    handler: 'launcher.launcher',
    runtime: 'nodejs8.10',
  });

  return { [entrypoint]: lambda };
};
