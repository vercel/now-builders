export function makeLauncher(
  entrypoint: string,
  shouldAddHelpers: boolean
): string {
  return `const { Bridge } = require("./bridge");

let bridge;

if (!process.env.NODE_ENV) {
  process.env.NODE_ENV =
    process.env.NOW_REGION === 'dev1' ? 'development' : 'production';
}

try {
  let listener = require("./${entrypoint}");
  if (listener.default) listener = listener.default;

  if (typeof listener.listen === 'function') {
    const server = listener;
    bridge = new Bridge(server);
    bridge.listen();
  } else if (typeof listener === 'function') {
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
    console.log('Assuming server listener. Type of imported listener is: ' + typeof listener);
    const { Server } = require("http");
    const saveListen = Server.prototype.listen;
    Server.prototype.listen = function listen() {
      console.log('Server.listen() called, setting up bridge');
      bridge.setServer(this);
      Server.prototype.listen = saveListen;
      return bridge.listen();
    };
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
