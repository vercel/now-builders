const path = require('path');
const { cli, cliWithOptions } = require('./cli');

const bundle = (command, wkdir) => async (...options) => {
  await cliWithOptions('bundle', wkdir)(command, ...options);
};

const symlink = mainDir => async (mirroredDir) => {
  await cli('sudo', 'ln', '-s', mainDir, mirroredDir);
};

// [ '/root/.rbenv/versions/$version/lib/ruby/gems/$version', '/root/.gem/ruby/$version' ]
const gemPath = async () => {
  const cmds = 'rbenv exec gem environment | grep INSTALLATION'.split(' ');
  // $ rbenv exec gem environment | grep INSTALLATION
  let paths = await cli(...cmds);
  paths = paths.stdout.split('\n');
  return paths.map(
    pat => pat.match(/.*INSTALLATION.*?:\s(\/.+\/\.(gem|rbenv)\/?.*\/ruby\/.+)/)[1],
  );
};

module.exports = async (gemfilePath, srcPath, ...args) => {
  const config = bundle('config', srcPath);
  const dir = path.join(path.dirname(gemfilePath), 'vendor', 'bundle');
  // process.chdir(srcPath)
  console.log('Installing your dependencies.....');
  await cli('gem', 'i', 'bundler');
  await config('without', 'development:test:ci');
  await config('auto_install', 'true');
  await bundle('i', srcPath)(`--gemfile=${gemfilePath}`, ...args); // `--path=${dir}`, ...args); // , '--deployment' )
  await bundle('package', srcPath)('--all');

  // symlink project's gems to avoid having to download gem after redeployment
  const systemGemDirs = await gemPath();
  const linkGemPath = await symlink(dir);
  systemGemDirs.map(linkGemPath);
  console.log('Dependencies installed correctly.....');

  return new Promise((resolve, reject) => {
    bundle('show')()
      .on('error', reject)
      .on('finish', result => console.log(result.stdout));
  });
};
