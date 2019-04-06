const crypto = require('crypto');
const fs = require('fs-extra');
const path = require('path');

const glob = require('@now/build-utils/fs/glob'); // eslint-disable-line import/no-extraneous-dependencies

const DIR_FLYING_SHUTTLE = '.flying-shuttle';
const DIR_CHUNKS_NAME = 'chunks';
const DIR_LAMBDAS_NAME = 'lambdas';
const EMPTY = Object.freeze({});

const FILE_MANIFEST = 'compilation-modules.json';
const FILE_BUILD_ID = 'HEAD_BUILD_ID';

module.exports.hasFlyingShuttle = async function hasFlyingShuttle({
  entryPath,
}) {
  const flyingShuttlePath = path.join(entryPath, DIR_FLYING_SHUTTLE);

  const files = await Promise.all([
    fs.pathExists(path.join(flyingShuttlePath, FILE_MANIFEST)),
    fs.pathExists(path.join(flyingShuttlePath, FILE_BUILD_ID)),
    fs.pathExists(path.join(flyingShuttlePath, DIR_CHUNKS_NAME)),
  ]);

  return files.some(b => !b);
};

module.exports.getUnchangedPages = async function getUnchangedPages({
  entryPath,
}) {
  const manifestPath = path.join(entryPath, DIR_FLYING_SHUTTLE, FILE_MANIFEST);
  const manifest = require(manifestPath);

  const { pages: pageFileDictionary, hashes } = manifest;
  const pageNames = Object.keys(pageFileDictionary);
  const allFiles = new Set();
  pageNames.forEach(pageName => pageFileDictionary[pageName].forEach(file => allFiles.add(file)));
  const fileChanged = new Map();
  await Promise.all(
    [...allFiles].map(async (file) => {
      const filePath = path.join(entryPath, file);
      const exists = await fs.pathExists(filePath);
      if (!exists) {
        fileChanged.set(file, true);
        return;
      }

      const hash = crypto
        .createHash('sha1')
        .update(await fs.readFile(filePath))
        .digest('hex');
      fileChanged.set(file, hash !== hashes[file]);
    }),
  );

  return pageNames.filter(
    p => !pageFileDictionary[p].map(f => fileChanged.get(f)).some(Boolean),
  );
};

module.exports.stageLambda = async function stageLambda({
  entryPath,
  pageName,
  lambda,
}) {
  const pagePath = path.join(entryPath, '.next', DIR_LAMBDAS_NAME, pageName);

  await fs.mkdirp(path.dirname(pagePath));
  await fs.writeFile(pagePath, JSON.stringify(lambda));
};

module.exports.getCache = async function getCache({ workPath, entryPath }) {
  const flyingShuttlePath = path.join(entryPath, DIR_FLYING_SHUTTLE);
  if (await fs.pathExists(flyingShuttlePath)) {
    await fs.remove(flyingShuttlePath);
  }
  await fs.mkdirp(flyingShuttlePath);

  const manifestPath = path.join(entryPath, '.next', FILE_MANIFEST);
  const buildIdPath = path.join(entryPath, '.next', 'static', FILE_BUILD_ID);
  if (
    !((await fs.pathExists(manifestPath)) && (await fs.pathExists(buildIdPath)))
  ) {
    return EMPTY;
  }

  const manifest = require(manifestPath);
  if (manifest.chunks && Object.keys(manifest.chunks).length) {
    return EMPTY;
  }

  const usedChunks = new Set();
  const pages = Object.keys(manifest.pageChunks);
  pages.forEach(page => manifest.pageChunks[page].forEach(file => usedChunks.add(file)));

  await fs.copy(manifestPath, path.join(flyingShuttlePath, FILE_MANIFEST));
  await fs.mkdirp(path.join(flyingShuttlePath, DIR_CHUNKS_NAME));
  await Promise.all(
    [...usedChunks].map(usedChunk => fs.copy(
      path.join(entryPath, '.next', usedChunk),
      path.join(flyingShuttlePath, DIR_CHUNKS_NAME, usedChunk),
    )),
  );
  await fs.copy(buildIdPath, path.join(flyingShuttlePath, FILE_BUILD_ID));
  await fs.copy(
    path.join(entryPath, '.next', DIR_LAMBDAS_NAME),
    path.join(entryPath, DIR_FLYING_SHUTTLE, DIR_LAMBDAS_NAME),
  );

  return glob(
    path.join(path.relative(workPath, flyingShuttlePath), '**'),
    workPath,
  );
};
