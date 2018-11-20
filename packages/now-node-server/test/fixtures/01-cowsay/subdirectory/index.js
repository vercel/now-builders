const yodasay = require('yodasay/build/yodasay.umd.js').say;
const http = require('http');

const server = http.createServer((req, resp) => {
  resp.end(yodasay({ text: 'RANDOMNESS_PLACEHOLDER' }));
});

server.listen();
