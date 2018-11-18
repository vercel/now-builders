const { parse } = require('url');
const cowsay = require('cowsay/build/cowsay.umd.js').say;

module.exports = (req, res) => {
  const { query } = parse(req.url, true);
  const { text = 'Use query `text`' } = query;
  res.end(cowsay({ text }));
};
