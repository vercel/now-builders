module.exports = (req, res) => {
  try {
    if (req) {
      throw new Error('failed');
    }
    res.end('you should never see this message');
  } catch (error) {
    res.end(error.toString());
  }
};
