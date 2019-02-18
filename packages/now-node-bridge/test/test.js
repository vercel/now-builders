const assert = require('assert');
const { Server } = require('http');
const { Bridge } = require('../bridge');

async function test() {
  const server = new Server(() => {});
  const bridge = new Bridge(server);
  bridge.listen();

  const info = await bridge.listening;
  // console.log(info);
  assert.equal(info.address, '127.0.0.1');
  assert.equal(typeof info.port, 'number');

  server.close();
  console.log('Tests passed!');
}

test().catch((err) => {
  console.error(err);
  process.exit(1);
});
