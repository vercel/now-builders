const execa = require('execa');

module.exports.cli = async (cmd, ...args) => {
  try {
    return await execa(cmd, [...args], { stdio: 'inherit' });
  } catch (err) {
    console.log(`failed to run ${cmd} ${args.join(' ')}`);
    console.log(`${err.message}`);
    throw err;
  }
};

module.exports.cliWithOptions = (cmd, cwd = null) => async (...args) => {
  try {
    return await execa(
      cmd,
      [...args],
      cwd ? { stdio: 'inherit', cwd } : { stdio: 'inherit' },
    );
  } catch (err) {
    console.log(`failed to run ${cmd} ${args.join(' ')}`);
    console.log(`${err.message}`);
    throw err;
  }
};
