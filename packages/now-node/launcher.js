const { Server } = require('http');
const { Bridge } = require('./bridge.js');

const bridge = new Bridge();
bridge.port = process.env.PORT || 3000;
let listener;

try {
  if (!process.env.NODE_ENV) {
    process.env.NODE_ENV = 'production';
  }

  // PLACEHOLDER
} catch (error) {
  console.error(error);
  bridge.userError = error;
}

const server = new Server(listener);
server.listen(bridge.port);

exports.launcher = bridge.launcher;

// When running in a process, we can receive events directly for execution
// instead of waiting on a listener.
if (process.send) {
  process.on('message', async (event) => {
    const response = await bridge.launcher(event);
    process.send(response);
  });
}
