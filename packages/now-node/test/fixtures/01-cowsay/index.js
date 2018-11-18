const cowsay = require('cowsay/build/cowsay.umd.js').say;

module.exports = (req, res) => {
  res.end(cowsay({ text: 'RANDOMNESS_PLACEHOLDER' }));
};
