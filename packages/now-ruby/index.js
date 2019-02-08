const path = require('path');
const { readFile, writeFile } = require('fs-extra');
const getWritableDirectory = require('@now/build-utils/fs/get-writable-directory.js');
const download = require('@now/build-utils/fs/download.js');
const glob = require('@now/build-utils/fs/glob.js');
const { createLambda } = require('@now/build-utils/lambda.js');

const aptInstallRuby = require('./apt-install-ruby');
const installRubyGems = require('./install-rubygems');

exports.config = {
  maxLambdaSize: '5mb',
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

exports.build = async ({ files, entrypoint }) => {
  console.log('downloading files...');

  const srcPath = await getWritableDirectory();

  const allFiles = await download(files, srcPath);

  console.log('Installing Ruby.....');
  const rubyVersion = getRubyVersion(allFiles) || '2.6.1';
  await aptInstallRuby(rubyVersion);

  if (allFiles.Gemfile) {
    console.log("'Gemfile' is present in your app......");

    const gemfile = allFiles.Gemfile.fsPath;
    await installRubyGems(gemfile, '--deployment');
  }

  const handlerForRubyFiles = await readFile(
    path.join(__dirname, 'now_handler.rb'),
    'utf8',
  );

  // replace all `require_relative 'now_handler'
  console.log('entrypoint is', entrypoint);
  const userDefinedHandlerPath = entrypoint.replace(/\.rb$/, '');
  const nowHandlerRbContents = handlerForRubyFiles.replace(
    '__NOW_HANDLER_FILE',
    userDefinedHandlerPath,
  );

  // in order to allow the user to have `now_handler.rb`, we need our `now_handler.rb` to be called
  // somethig else
  const nowHandlerRbFilename = 'now__handler__ruby';

  await writeFile(
    path.join(srcPath, `${nowHandlerRbFilename}.rb`),
    nowHandlerRbContents,
  );

  const lambda = await createLambda({
    files: await glob('**', srcPath),
    handler: 'now_handler',
    runtime: 'ruby',
    environment: {},
  });

  return {
    [entrypoint]: lambda,
  };
};
