const { createLambda } = require('@now/build-utils/lambda.js');
const FileBlob = require('@now/build-utils/file-blob.js');
const FileFsRef = require('@now/build-utils/file-fs-ref.js');
const glob = require('@now/build-utils/fs/glob.js');
const path = require('path');
const rename = require('@now/build-utils/fs/rename.js');

exports.config = {
  maxLambdaSize: '20mb',
};

exports.build = async ({ files, entrypoint }) => {
  // move all user code to 'user' subdirectory
  const userFiles = rename(files, name => path.join('user', name));
  const nativeFiles = await glob('native/**', __dirname);

  const ini = await FileBlob.fromStream({ stream: nativeFiles['native/php.ini'].toStream() });
  ini.data = ini.data.toString().replace(/\/root\/go\/app\/modules/g, '/var/task/native/modules');
  nativeFiles['native/php.ini'] = ini;

  const launcherFiles = {
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
