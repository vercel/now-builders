const { createLambda } = require('@now/build-utils/lambda.js');
const glob = require('@now/build-utils/fs/glob.js');
const download = require('@now/build-utils/fs/download.js');
const getWritableDir = require('@now/build-utils/fs/get-writable-directory.js');
const path = require('path');
const rename = require('@now/build-utils/fs/rename.js');

exports.config = {
  maxLambdaSize: '10mb',
};

exports.build = async ({ files, entrypoint, config }) => {
  // Fetch the included files config, or default (**)
  const includedFilesGlob = (config ? config.include : false) || '**';
  let includedFiles = files;
  if (includedFilesGlob !== '**') {
    // Download the files to run a glob against them
    const tmpDir = getWritableDir();
    await download(files, tmpDir);
    includedFiles = await glob(includedFilesGlob, tmpDir);
  }
  // move all user code to 'user' subdirectory
  const userFiles = rename(includedFiles, name => path.join('user', name));
  const launcherFiles = await glob('**', path.join(__dirname, 'dist'));
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
