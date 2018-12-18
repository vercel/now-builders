const assert = require('assert');
const { createLambda } = require('@now/build-utils/lambda.js');
const fetch = require('node-fetch');
const FileBlob = require('@now/build-utils/file-blob.js');
const { getFiles } = require('@now/php-bridge');
const path = require('path');
const rename = require('@now/build-utils/fs/rename.js');
const streamToBuffer = require('@now/build-utils/fs/stream-to-buffer.js');
const yauzl = require('yauzl');

exports.config = {
  maxLambdaSize: '20mb',
};

async function readReleaseUrl(releaseUrl) {
  const resp = await fetch(releaseUrl);

  if (!resp.ok) {
    throw new Error(`Failed to download ${releaseUrl}. Status code is ${resp.status}`);
  }

  return resp.buffer();
}

const prefixRegexp = /^wordpress\//;

function decompressBuffer(buffer) {
  return new Promise((resolve, reject) => {
    const files = {};

    yauzl.fromBuffer(buffer, { lazyEntries: true }, (error, zipfile) => {
      if (error) {
        reject(error);
        return;
      }

      zipfile.readEntry();
      zipfile.on('entry', (entry) => {
        const { fileName } = entry;

        if (/\/$/.test(fileName)) {
          zipfile.readEntry();
          return;
        }

        zipfile.openReadStream(entry, (error2, readStream) => {
          if (error2) {
            reject(error2);
            return;
          }

          streamToBuffer(readStream).then((data) => {
            assert(prefixRegexp.test(fileName), fileName);
            const fileName2 = fileName.replace(prefixRegexp, '');
            files[fileName2] = new FileBlob({ data });
            zipfile.readEntry();
          }).catch(reject);
        });
      });

      zipfile.on('end', () => resolve(files));
    });
  });
}

const staticRegexps = [
  /\.css$/, /\.png$/, /\.jpg$/, /\.svg$/, /\.js$/,
];

exports.build = async ({ files, entrypoint, config }) => {
  if (!config.releaseUrl) {
    throw new Error('Config must contain a "releaseUrl" for wordpress.zip');
  }

  console.log('downloading release url...');
  const releaseBuffer = await readReleaseUrl(config.releaseUrl);
  console.log('decompressing release url...');
  const releaseFiles = await decompressBuffer(releaseBuffer);
  const mergedFiles = { ...releaseFiles, ...files };

  const staticFiles = {};
  // eslint-disable-next-line no-restricted-syntax
  for (const [k, v] of Object.entries(mergedFiles)) {
    if (staticRegexps.some(r => r.test(k))) {
      staticFiles[k] = v;
    }
  }

  // move all code to 'user' subdirectory
  const userFiles = rename(mergedFiles, name => path.join('user', name));
  const bridgeFiles = await getFiles();

  const lambda = await createLambda({
    files: { ...userFiles, ...bridgeFiles },
    handler: 'launcher.launcher',
    runtime: 'nodejs8.10',
  });

  return { [entrypoint]: lambda, ...staticFiles };
};
