export function makeLauncher(
  entrypoint: string,
  shouldAddHelpers: boolean
): string {
  return `const { Bridge } = require("./bridge");
const { Server } = require("http");

let isServerListening = false;
let bridge = new Bridge();
const saveListen = Server.prototype.listen;
Server.prototype.listen = function listen() {
  isServerListening = true;
  console.log('Server.listen() called, setting up bridge');
  bridge.setServer(this);
  Server.prototype.listen = saveListen;
  return bridge.listen();
};

if (!process.env.NODE_ENV) {
  process.env.NODE_ENV =
    process.env.NOW_REGION === 'dev1' ? 'development' : 'production';
}

try {
  let listener = require("./${entrypoint}");
  if (listener.default) listener = listener.default;

  if (isServerListening) {
    console.log('Server is listening');
  } else if (typeof listener.listen === 'function') {
    Server.prototype.listen = saveListen;
    const server = listener;
    bridge = new Bridge(server);
    bridge.listen();
  } else if (typeof listener === 'function') {
    Server.prototype.listen = saveListen;
    ${
      shouldAddHelpers
        ? [
            'bridge = new Bridge(undefined, true);',
            'const server = require("./helpers").createServerWithHelpers(listener, bridge);',
            'bridge.setServer(server);',
          ].join('\n')
        : [
            'const server = require("http").createServer(listener);',
            'bridge = new Bridge(server);',
          ].join('\n')
    }
    bridge.listen();
  } else {
    console.error('Export is invalid. Did you forget to export a function or a server?');
    process.exit(1);
  }
} catch (err) {
  if (err.code === 'MODULE_NOT_FOUND') {
    console.error(err.message);
    console.error('Did you forget to add it to "dependencies" in \`package.json\`?');
    process.exit(1);
  } else {
    console.error(err);
    process.exit(1);
  }
}

exports.launcher = bridge.launcher;`;
}
