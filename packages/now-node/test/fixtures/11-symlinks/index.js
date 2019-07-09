import fs from 'fs';

export default function handler(req, res) {
  res.end(fs.readlinkSync(`${__dirname}/symlink`));
}
