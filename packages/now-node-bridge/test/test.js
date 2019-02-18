const assert = require('assert');
const { Server } = require('http');
const { Bridge } = require('../bridge');

async function test() {
  let body;
  let result;
  const server = new Server((req, res) => res.end(
    JSON.stringify({
      method: req.method,
      path: req.url,
      headers: req.headers,
    }),
  ));
  const bridge = new Bridge(server);
  bridge.listen();

  // Test port binding
  const info = await bridge.listening;
  assert.equal(info.address, '127.0.0.1');
  assert.equal(typeof info.port, 'number');

  // Test `APIGatewayProxyEvent` normalizing
  result = await bridge.launcher({
    httpMethod: 'GET',
    headers: { foo: 'bar' },
    path: '/apigateway',
    body: null,
  });
  assert.equal(result.encoding, 'base64');
  assert.equal(result.statusCode, 200);
  body = JSON.parse(Buffer.from(result.body, 'base64').toString());
  assert.equal(body.method, 'GET');
  assert.equal(body.path, '/apigateway');
  assert.equal(body.headers.foo, 'bar');

  // Test `NowProxyEvent` normalizing
  result = await bridge.launcher({
    Action: 'invoke',
    body: JSON.stringify({
      method: 'POST',
      headers: { foo: 'baz' },
      path: '/nowproxy',
      body: 'body=1',
    }),
  });
  assert.equal(result.encoding, 'base64');
  assert.equal(result.statusCode, 200);
  body = JSON.parse(Buffer.from(result.body, 'base64').toString());
  assert.equal(body.method, 'POST');
  assert.equal(body.path, '/nowproxy');
  assert.equal(body.headers.foo, 'baz');

  server.close();
  console.log('Tests passed!');
}

test().catch((err) => {
  console.error(err);
  process.exit(1);
});
