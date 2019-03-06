const execa = require('execa');

const tryCmd = async (cmd, errMsg = null, ...args) => {
  console.log(`running ${cmd} ${args.join(' ')}"...`);
  try {
    await execa(cmd, [...args], { stdio: 'inherit' });
  } catch (err) {
    console.log(`failed to run ${cmd} ${args.join(' ')}`);
    console.log(`${errMsg || err.message}`);
    throw err;
  }
};

module.exports = async (gemfilePath, ...args) => {
  await tryCmd('ruby', 'Ruby not installed', '-v');
  await tryCmd('gem', null, 'i', 'bundler');
  await tryCmd('bundle', null, 'i', `--gemfile=${gemfilePath}`, ...args); // , '--deployment' )

  return new Promise((resolve, reject) => {
    execa('bundle', ['show'])
      .on('error', reject)
      .on('finish', result => console.log(result.stdout));
  });
};
