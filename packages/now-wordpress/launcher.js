const path = require('path');
const { spawn } = require('child_process');
const { Bridge } = require('./bridge.js');

const bridge = new Bridge();
exports.launcher = bridge.launcher;

try {
  const phpServer = spawn(
    './php',
    ['-c', 'php.ini', '-S', '0.0.0.0:9000'],
    {
      stdio: 'inherit',
      cwd: path.join(__dirname, 'native'),
    },
  );

  phpServer.on('exit', () => {
    process.exit();
  });

  bridge.port = 9000;
} catch (error) {
  console.error(error);
  bridge.userError = error;
}
