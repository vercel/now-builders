const path = require('path');

const fs = require('fs');
const fetch = require('node-fetch');
const tar = require('tar');
const getWritableDirectory = require('@now/build-utils/fs/get-writable-directory.js');

const url = 'https://dl.google.com/go/go1.11.1.darwin-amd64.tar.gz';

module.exports = async () => {
  console.log('downloading go binary...');

  // const res = await fetch(url);
  const res = await new Promise((resolve) => {
    const filePath = '/Users/eric/Downloads/go1.11.1.darwin-amd64.tar.gz';
    const stream = fs.createReadStream(filePath);
    stream.on('open', () => {
      resolve(
        new fetch.Response(stream, {
          url,
          status: 200,
          statustext: 'OK',
          size: fs.statSync(filePath).size,
        }),
      );
    });
  });

  const dir = await getWritableDirectory();

  if (!res.ok) {
    throw new Error(`Failed to download: ${url}`);
  }

  return new Promise((resolve, reject) => {
    res.body
      .on('error', reject)
      .pipe(tar.extract({ cwd: dir, strip: 1 }))
      .on('finish', () => resolve(path.join(dir, 'bin', 'go')));
  });
};
