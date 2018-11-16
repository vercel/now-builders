const { spawn } = require('child_process');

function spawnAsync(command, args, options = { stdio: ['inherit'] }) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, options);
    child.on('error', reject);
    child.on('close', (code, signal) => {
      if (code) {
        return reject(new Error(`Exited with ${code || signal}`));
      }

      return resolve();
    });
  });
}

module.exports.init = async function init({ output }) {
  // TODO Install these dependencies elsewhere, or via `--no-save`
  await spawnAsync('yarn', ['add', 'add', 'next', 'react', 'react-dom'], {
    stdio: [
      'inherit',
      output.debugEnabled ? 'inherit' : 'ignore',
      output.debugEnabled ? 'inherit' : 'ignore',
    ],
  });
};

module.exports.build = async function build({ output }) {
  // TODO Because `yarn run` uses node_modules/.bin, this will break
  // if `npm` is ran instead.
  spawnAsync('yarn', ['run', 'next'], {
    stdio: [
      'inherit',
      output.debugEnabled ? 'inherit' : 'ignore',
      output.debugEnabled ? 'inherit' : 'ignore',
    ],
  });
};
