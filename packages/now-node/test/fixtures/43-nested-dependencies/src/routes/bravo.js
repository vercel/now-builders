const { say } = require('../../lib/util');

module.exports = (req, resp) => {
  resp.end(say('bravo'));
};
