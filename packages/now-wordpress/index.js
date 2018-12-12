const { createLambda } = require('@now/build-utils/lambda.js');
const FileBlob = require('@now/build-utils/file-blob.js');
const glob = require('@now/build-utils/fs/glob.js');
const path = require('path');
const rename = require('@now/build-utils/fs/rename.js');

exports.config = {
  maxLambdaSize: '20mb',
};

exports.build = async ({ files, entrypoint }) => {
  // move all user code to 'user' subdirectory
  const userFiles = rename(files, name => path.join('user', name));
  const launcherFiles = await glob('**', path.join(__dirname, 'dist'));

  const ini = await FileBlob.fromStream({ stream: launcherFiles['php.ini'].toStream() });
  ini.data = ini.data.toString().replace(/\/root\/go\/app\/modules/g, '/var/task/modules');
  launcherFiles['php.ini'] = ini;

  const zipFiles = { ...userFiles, ...launcherFiles };

  const lambda = await createLambda({
    files: zipFiles,
    handler: 'launcher',
    runtime: 'go1.x',
    environment: {
      SCRIPT_NAME: path.join('/', entrypoint),
      NOW_PHP_SCRIPT: path.join('user', entrypoint),
    },
  });

  return { [entrypoint]: lambda };
};
