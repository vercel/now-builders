const execa = require('execa');

module.exports = async (cmd, ...args) => {
  try {
    return await execa(cmd, [...args], { stdio: 'inherit' });
  } catch (err) {
    console.log(`failed to run ${cmd} ${args.join(' ')}`);
    console.log(`${err.message}`);
    throw err;
  }
};
