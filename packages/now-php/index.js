const { createLambda } = require('@now/build-utils/lambda.js');
const glob = require('@now/build-utils/fs/glob.js');
const minimatch = require('minimatch');
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
    // match the files with the glob
    includedFiles = Object.keys(files)
      .filter(minimatch.filter(includedFilesGlob))
      .reduce((res, key) => {
        res[key] = files[key];
        return res;
      }, {});
    // explicit and always include the entrypoint
    includedFiles[entrypoint] = files[entrypoint];
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
