const cowsay = require('cowsay/build/cowsay.umd.js').say;
const http = require('http');

const server = http.createServer((req, resp) => {
  resp.end(cowsay({ text: 'RANDOMNESS_PLACEHOLDER' }));
});

server.listen();
