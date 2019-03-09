const cli = require('./cli');

const bundle = async command => async (...options) => {
  await cli('bundle', command, ...options);
};

const config = bundle('config');

module.exports = async (gemfilePath, srcPath, ...args) => {
  // process.chdir(srcPath)
  console.log('Installing your dependencies.....');
  await cli('gem', 'i', 'bundler');
  await config('without', 'development:test:ci');
  await config('auto_install', 'true');
  await bundle('i')(`--gemfile=${gemfilePath}`, ...args); // , '--deployment' )
  await bundle('package', '--all');
  console.log('Dependencies installed correctly.....');

  return new Promise((resolve, reject) => {
    bundle('show')()
      .on('error', reject)
      .on('finish', result => console.log(result.stdout));
  });
};
