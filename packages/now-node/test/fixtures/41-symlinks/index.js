const sayHello = require('./symlink/file');

module.exports = (req, res) => {
  res.send(`${sayHello('jon')}:RANDOMNESS_PLACEHOLDER`);
};
