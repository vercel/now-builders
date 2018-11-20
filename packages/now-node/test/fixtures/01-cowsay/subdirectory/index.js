const yodasay = require('yodasay/build/yodasay.umd.js').say;

module.exports = (req, resp) => {
  resp.end(yodasay({ text: 'yoda:RANDOMNESS_PLACEHOLDER' }));
};
