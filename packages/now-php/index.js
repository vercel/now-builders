const path = require('path');
const { createLambda, rename, shouldServe } = require('@now/build-utils'); // eslint-disable-line import/no-extraneous-dependencies
const {
  getPhpFiles,
  getLauncherFiles,
  getIncludedFiles,
  getComposerFiles,
  getRuntime,
} = require('@now/php-bridge');

// ###########################
// EXPORTS
// ###########################

exports.analyze = ({ files, entrypoint }) => files[entrypoint].digest;

exports.shouldServe = shouldServe;

exports.build = async ({
  files, entrypoint, workPath, config, meta,
}) => {
  const runtime = getRuntime(config);

  const bridgeFiles = {
    ...(await getPhpFiles({ workPath, config })),
    ...(await getLauncherFiles(config)),
  };

  const includedFiles = {
    ...(await getIncludedFiles({
      files,
      entrypoint,
      workPath,
      config,
      meta,
    })),
    ...(await getComposerFiles({ workPath, config })),
  };

  const userFiles = rename(includedFiles, name => path.join('user', name));

  if (process.env.NOW_PHP_DEBUG === '1') {
    console.log('🐘 Entrypoint:', entrypoint);
    console.log('🐘 Runtime:', runtime);
    console.log('🐘 Config:', config);
    console.log('🐘 Work path:', workPath);
    console.log('🐘 Meta:', meta);
    console.log('🐘 User files:', Object.keys(userFiles));
    console.log('🐘 Bridge files:', Object.keys(bridgeFiles));
    console.log('🐘 PHP: php.ini', bridgeFiles['php/php.ini'].data.toString());
  }

  const lambda = await createLambda({
    files: { ...userFiles, ...bridgeFiles },
    handler: 'launcher.launcher',
    runtime,
    environment: {
      NOW_ENTRYPOINT: entrypoint,
      NOW_PHP_DEV: (meta || {}).isDev ? '1' : '0',
    },
  });

  return { [entrypoint]: lambda };
};
