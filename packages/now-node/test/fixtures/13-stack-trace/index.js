module.exports = (req, res) => {
  try {
    if (req) {
      throw new Error(
        `You should see this error ${process.env.RANDOMNESS_ENV_VAR}`,
      );
    }
    res.end(
      `You should not see this message ${process.env.RANDOMNESS_ENV_VAR}`,
    );
  } catch (error) {
    res.end(error.stack);
  }
};
