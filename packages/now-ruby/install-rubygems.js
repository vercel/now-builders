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
  // try {
  //   await execa('ruby', ['-v'], { stdio: 'inherit' })
  // } catch(err) {
  //   console.log("Ruby not installed")
  //   throw err
  // }

  await tryCmd('ruby', 'Ruby not installed', '-v');
  await tryCmd('gem', null, 'i', 'bundler');
  await tryCmd('bundle', null, 'i', `--gemfile=${gemfilePath}`, ...args); // , '--deployment' )

  // try {
  //   await execa('gem', ['i', 'bundler'], { stdio: 'inherit' })
  // } catch(err) {
  //   console.log(`${err.message}`)
  //   throw err
  // }

  return new Promise((resolve, reject) => {
    execa('bundle', ['show'])
      .on('error', reject)
      .on('finish', result => console.log(result.stdout));
  });
};
