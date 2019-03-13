const path = require('path');
const { readFile, writeFile } = require('fs-extra');
const getWritableDirectory = require('@now/build-utils/fs/get-writable-directory.js');
const download = require('@now/build-utils/fs/download.js');
const glob = require('@now/build-utils/fs/glob.js');
const { createLambda } = require('@now/build-utils/lambda.js');
const { cliWithOptions } = require('./cli');

const aptInstallRuby = require('./apt-install-ruby');
const installRubyGems = require('./install-rubygems');

exports.config = {
  maxLambdaSize: '20mb',
};

function getRubyVersion(files) {
  const versionFile = (files['.ruby-version'] || files.Gemfile).data;
  if (!versionFile) return versionFile; // versionFile is undefined
  // different version spec format per file
  // Example
  // Gemfile: ruby '2.5.1'
  // .ruby-version: 'ruby-2.5.1'
  const versionNumber = versionFile
    .toString()
    .match(/ruby(?:\s|-)(?<version>\d\.\d\.\d)/);
  return versionNumber ? versionNumber.groups.version : undefined; // null guard
}

function checkForUserSpecifiedHandler(files) {
  return Object.keys(files)
    .filter(key => ['handler.rb', 'lambda.rb', 'now_handler.rb'].includes(key))
    .shift();
}

exports.build = async ({ files, entrypoint }) => {
  console.log('downloading files...');

  const srcPath = await getWritableDirectory();

  const allFiles = await download(files, srcPath);

  console.log('Installing Ruby.....');
  let rubyVersion = getRubyVersion(allFiles); // || '2.6.1';
  rubyVersion = await aptInstallRuby(rubyVersion);

  // eslint-disable-next-line no-unused-vars
  const [_, installedRubyVersion] = rubyVersion.match(/([0-9]\.[0-9]\.[0-9])$/);
  console.log(installedRubyVersion);

  if (allFiles.Gemfile) {
    console.log("'Gemfile' is present in your app......");

    const gemfile = allFiles.Gemfile.fsPath;
    await installRubyGems(gemfile, srcPath, '--deployment');
  }

  if (allFiles['build.sh']) {
    await cliWithOptions('bash', srcPath)(allFiles['build.sh'].fsPath);
  }

  const handlerFile = checkForUserSpecifiedHandler(allFiles);
  let nowHandlerRbFilename = '';

  if (!handlerFile) {
    const handlerForRubyFiles = await readFile(
      path.join(__dirname, 'now_handler.rb'),
      'utf8',
    );

    // replace all `require_relative 'now_handler'`
    console.log('entrypoint is', entrypoint);
    const userDefinedHandlerPath = entrypoint.replace(/\.rb$/, '');
    const nowHandlerRbContents = handlerForRubyFiles.replace(
      '__NOW_HANDLER_FILE',
      userDefinedHandlerPath,
    );

    // in order to allow the user to have `now_handler.rb`,
    // we need our `now_handler.rb` to be called
    // somethig else
    nowHandlerRbFilename = 'now__handler__ruby';

    await writeFile(
      path.join(srcPath, `${nowHandlerRbFilename}.rb`),
      nowHandlerRbContents,
    );
  }

  const lambda = await createLambda({
    files: await glob('**', srcPath),
    handler: handlerFile
      ? `${handlerFile}.handler`
      : `${nowHandlerRbFilename}.NowHandler.now_handler`,
    runtime: 'ruby',
    environment: {},
  });

  return {
    [entrypoint]: lambda,
  };
};
