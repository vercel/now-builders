const execa = require('execa');

module.exports = async () => {
  try {
    await execa('sudo apt-get update', [], { stdio: 'inherit' });
    await execa('sudo apt-get install ruby-full', [], { stdio: 'inherit' });
  } catch (err) {
    console.log(`${err.message}`);
    throw err;
  }

  return new Promise((resolve, reject) => {
    execa('ruby', ['-v'])
      .on('error', reject)
      .on('finish', result => console.log(result.stdout));
  });
};
