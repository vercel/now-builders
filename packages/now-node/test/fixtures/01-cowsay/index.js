const cowsay = require('cowsay/build/cowsay.umd.js').say;

module.exports = (req, resp) => {
  resp.end(cowsay({ text: 'RANDOMNESS_PLACEHOLDER' }));
};
