const { parse } = require('url');
const yodasay = require('yodasay/build/yodasay.umd.js').say;

module.exports = (req, res) => {
  const { query } = parse(req.url, true);
  const { text = 'Use query `text`' } = query;
  res.end(yodasay({ text }));
};
