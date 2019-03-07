const cli = require('./cli');

module.exports = async (gemfilePath, ...args) => {
  console.log('Installing your dependencies.....');
  await cli('gem', 'i', 'bundler');
  await cli('bundle', 'i', `--gemfile=${gemfilePath}`, ...args); // , '--deployment' )
  console.log('Dependencies installed correctly.....');

  return new Promise((resolve, reject) => {
    cli('bundle', 'show')
      .on('error', reject)
      .on('finish', result => console.log(result.stdout));
  });
};
