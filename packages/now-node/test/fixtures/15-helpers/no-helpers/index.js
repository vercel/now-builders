module.exports = (req, res) => {
  const areHelpersAvailable = !!req.query;

  res.end(`${areHelpersAvailable ? 'yes' : 'no'}:RANDOMNESS_PLACEHOLDER`);
};
