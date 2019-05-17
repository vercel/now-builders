const { Server } = require('http');
const { Bridge } = require('./bridge');

let handler;

try {
  // PLACEHOLDER
} catch (err) {
  console.error(err);
  process.exit(1);
}

const server = new Server(handler);
const bridge = new Bridge(server);

bridge.listen();

exports.launcher = bridge.launcher;
