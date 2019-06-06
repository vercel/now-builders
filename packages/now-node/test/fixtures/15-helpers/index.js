module.exports = (req, res) => {
  res.status(200);
  res.send(`hello ${req.query.who || 'anonymous'}:RANDOMNESS_PLACEHOLDER`);
};
