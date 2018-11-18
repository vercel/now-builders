const yodasay = require('yodasay/build/yodasay.umd.js').say;

module.exports = (req, res) => {
  res.end(yodasay({ text: 'RANDOMNESS_PLACEHOLDER' }));
};
