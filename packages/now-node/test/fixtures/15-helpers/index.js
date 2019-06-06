module.exports = (req, res) => {
  res.send(`hello ${req.query.who || 'anonymous'}:RANDOMNESS_PLACEHOLDER`);
};
