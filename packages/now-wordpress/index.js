const { createLambda } = require('@now/build-utils/lambda.js');
const path = require('path');
const rename = require('@now/build-utils/fs/rename.js');
const { getFiles } = require('@now/php-bridge');

exports.config = {
  maxLambdaSize: '20mb',
};

exports.build = async ({ files, entrypoint }) => {
  // move all user code to 'user' subdirectory
  const userFiles = rename(files, name => path.join('user', name));
  const bridgeFiles = await getFiles();

  const lambda = await createLambda({
    files: { ...userFiles, ...bridgeFiles },
    handler: 'launcher.launcher',
    runtime: 'nodejs8.10',
  });

  return { [entrypoint]: lambda };
};
