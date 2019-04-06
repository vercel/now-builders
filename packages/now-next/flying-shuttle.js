const fs = require('fs-extra');
const path = require('path');

const glob = require('@now/build-utils/fs/glob'); // eslint-disable-line import/no-extraneous-dependencies

const DIR_FLYING_SHUTTLE = '.flying-shuttle';
const DIR_FLYING_SHUTTLE_CHUNKS_NAME = 'chunks';
const EMPTY = Object.freeze({});

const FILE_MANIFEST = 'compilation-modules.json';
const FILE_BUILD_ID = 'HEAD_BUILD_ID';

export async function hasFlyingShuttle({ entryPath }) {
  const flyingShuttlePath = path.join(entryPath, DIR_FLYING_SHUTTLE);

  const files = await Promise.all([
    fs.pathExists(path.join(flyingShuttlePath, FILE_MANIFEST)),
    fs.pathExists(path.join(flyingShuttlePath, FILE_BUILD_ID)),
    fs.pathExists(path.join(flyingShuttlePath, DIR_FLYING_SHUTTLE_CHUNKS_NAME)),
  ]);

  return files.some(b => !b);
}

export async function getCache({ workPath, entryPath }) {
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
  await fs.mkdirp(path.join(flyingShuttlePath, DIR_FLYING_SHUTTLE_CHUNKS_NAME));
  await Promise.all(
    [...usedChunks].map(usedChunk => fs.copy(
      path.join(entryPath, '.next', usedChunk),
      path.join(flyingShuttlePath, DIR_FLYING_SHUTTLE_CHUNKS_NAME, usedChunk),
    )),
  );
  await fs.copy(buildIdPath, path.join(flyingShuttlePath, FILE_BUILD_ID));

  return glob(
    path.join(path.relative(workPath, flyingShuttlePath), '**'),
    workPath,
  );
}
