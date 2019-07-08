export default function handler(req, res) {
  try {
    if (req) {
      req.notdefined.something;
    }
    res.end('Should not print');
  } catch (error) {
    res.end(error.stack);
  }
}
