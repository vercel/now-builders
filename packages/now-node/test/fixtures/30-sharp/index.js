const download = require('download');
const { tmpdir } = require('os');
const { join } = require('path');
const sharp = require('sharp');

const url = 'https://icdn2.digitaltrends.com/image/monkey-selfie-david-slater.jpg';
const tmp = tmpdir();

module.exports = async (req, res) => {
  const file = join(tmp, 'monkey-selfie-david-slater.jpg');
  console.log(`incoming req, downloading image to ${file}`);
  await download(url, tmp);
  console.log('downloaded. resizing image...');
  const image = sharp(file).resize({
    height: 100,
    width: 100,
  });
  res.writeHead(200, { 'Content-Type': 'image/jpeg' });
  const buffer = await image.jpeg().toBuffer();
  if (buffer.length > 0) {
    res.end('sharp:RANDOMNESS_PLACEHOLDER');
  } else {
    res.end('buffer is empty');
  }
};
