const assert = require('assert');
const { Server } = require('http');
const { Bridge } = require('../bridge');

async function main() {
  let err;
  const server = new Server(async (req, res) => {
    throw new Error('unhandled');
  });
  const bridge = new Bridge(server);
  bridge.listen();

  try {
    await bridge.launcher({
      Action: 'Invoke',
      body: JSON.stringify({
        method: 'GET',
        headers: {},
        path: '/'
      })
    });
  } catch (_err) {
    err = _err;
  }

  assert(err);
  assert.equal(err.message, 'unhandled');

  server.close();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
