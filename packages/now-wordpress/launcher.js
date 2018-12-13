const { Bridge } = require('./bridge.js');

const bridge = new Bridge();
exports.launcher = bridge.launcher;
bridge.port = 9000;
