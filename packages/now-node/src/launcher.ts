export function makeLauncher(
  entrypoint: string,
  shouldAddHelpers: boolean
): string {
  return `const Bridge = require("./bridge").Bridge;

const bridge = new Bridge(undefined, ${shouldAddHelpers ? 'true' : 'false'});

if (!process.env.NODE_ENV) {
  process.env.NODE_ENV =
    process.env.NOW_REGION === 'dev1' ? 'development' : 'production';
}

try {
  let listener = require("./${entrypoint}");
  if (listener.default) listener = listener.default;
  const server = ${
    shouldAddHelpers
      ? 'require("./helpers").createServerWithHelpers(listener, bridge)'
      : 'require("http").createServer(listener)'
  };
  bridge.setServer(server);
} catch (err) {
  if (err.code === 'MODULE_NOT_FOUND') {
    console.error(err.message);
    console.error(
      'Did you forget to add it to "dependencies" in \`package.json\`?'
    );
    process.exit(1);
  } else {
    console.error(err);
    process.exit(1);
  }
}

bridge.listen();

exports.launcher = bridge.launcher;`;
}
