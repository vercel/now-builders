const crypto = require('crypto');
const fs = require('fs-extra');
const path = require('path');
const { Sema } = require('async-sema');

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

  // TODO: check that `yarn.lock`, `package.json`, `package-lock.json`,
  // and `pages/_document.js` (and _document deps) are unchanged.
  return files.reduce((acc, cur) => acc && cur, true);
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

  const unchangedPages = pageNames.filter(
    p => !pageFileDictionary[p].map(f => fileChanged.get(f)).some(Boolean),
  );
  return unchangedPages.filter(
    pageName => pageName !== '/_app'
      && pageName !== '/_error'
      && pageName !== '/_document',
  );
};

module.exports.stageLambda = async function stageLambda({
  entryPath,
  pageName,
  lambda,
}) {
  const pagePath = path.join(
    entryPath,
    '.next',
    DIR_LAMBDAS_NAME,
    `${pageName}.json`,
  );

  await fs.mkdirp(path.dirname(pagePath));
  await fs.writeFile(pagePath, JSON.stringify(lambda));
};

const recallSema = new Sema(1);

module.exports.recallLambda = async function recallLambda({
  entryPath,
  entryDirectory,
  pageName,
  onLambda,
}) {
  const pagePath = path.join(
    entryPath,
    DIR_FLYING_SHUTTLE,
    DIR_LAMBDAS_NAME,
    `${pageName}.json`,
  );
  if (!(await fs.pathExists(pagePath))) {
    throw new Error(
      `[FLYING SHUTTLE] failed shuttle :: unable to find page: ${pageName}`,
    );
  }

  const lambda = JSON.parse(await fs.readFile(pagePath, 'utf8'));
  Object.keys(lambda).forEach((lambdaKey) => {
    if (lambda[lambdaKey].type !== 'Buffer') {
      return;
    }

    lambda[lambdaKey] = Buffer.from(lambda[lambdaKey].data);
  });

  onLambda(path.join(entryDirectory, pageName), lambda);

  await this.stageLambda({ entryPath, pageName, lambda });

  // TODO: hydrate .next/FILE_MANIFEST and .next/filesystem with recalled lambda

  const flyingShuttlePath = path.join(entryPath, DIR_FLYING_SHUTTLE);
  const currentPath = path.join(entryPath, '.next');

  const shuttleManifestPath = path.join(flyingShuttlePath, FILE_MANIFEST);
  const currentManifestPath = path.join(currentPath, FILE_MANIFEST);
  const shuttleBuildIdPath = path.join(flyingShuttlePath, FILE_BUILD_ID);
  const currentBuildIdPath = path.join(currentPath, 'static', FILE_BUILD_ID);

  const recallPageName = path.isAbsolute(pageName) ? pageName : `/${pageName}`;

  await recallSema.acquire();
  try {
    const shuttleManifest = JSON.parse(
      await fs.readFile(shuttleManifestPath, 'utf8'),
    );
    const currentManifest = JSON.parse(
      await fs.readFile(currentManifestPath, 'utf8'),
    );

    const shuttleBuildId = (await fs.readFile(
      shuttleBuildIdPath,
      'utf8',
    )).trim();
    const currentBuildId = (await fs.readFile(
      currentBuildIdPath,
      'utf8',
    )).trim();

    const {
      pages: recallPages,
      pageChunks: recallPageChunks,
      hashes: recallHashes,
    } = shuttleManifest;
    const { pages, pageChunks, hashes } = currentManifest;

    const recallPage = recallPages[recallPageName];

    const movedPageChunks = [];
    const rewriteRegex = new RegExp(`${shuttleBuildId}[\\/\\\\]`);
    await Promise.all(
      recallPageChunks[recallPageName].map(async (recallFileName) => {
        if (!rewriteRegex.test(recallFileName)) {
          if (!(await fs.pathExists(path.join(currentPath, recallFileName)))) {
            await fs.copy(
              path.join(flyingShuttlePath, DIR_CHUNKS_NAME, recallFileName),
              path.join(currentPath, recallFileName),
            );
            console.debug(
              'recall',
              path.join(flyingShuttlePath, DIR_CHUNKS_NAME, recallFileName),
              'as',
              path.join(currentPath, recallFileName),
            );
          }
          movedPageChunks.push(recallFileName);
          return;
        }

        const newFileName = recallFileName.replace(
          rewriteRegex,
          `${currentBuildId}/`,
        );
        if (!(await fs.pathExists(path.join(currentPath, newFileName)))) {
          await fs.copy(
            path.join(flyingShuttlePath, DIR_CHUNKS_NAME, recallFileName),
            path.join(currentPath, newFileName),
          );
          console.debug(
            'rewrite',
            path.join(flyingShuttlePath, DIR_CHUNKS_NAME, recallFileName),
            'as',
            path.join(currentPath, newFileName),
          );
        }
        movedPageChunks.push(newFileName);
      }),
    );

    await fs.writeJson(
      currentManifestPath,
      Object.assign(currentManifest, {
        pages: Object.assign(pages, { [recallPageName]: recallPage }),
        pageChunks: Object.assign(pageChunks, {
          [recallPageName]: movedPageChunks,
        }),
        hashes: Object.assign(
          hashes,
          recallPage.reduce(
            (acc, cur) => Object.assign(acc, { [cur]: recallHashes[cur] }),
            {},
          ),
        ),
      }),
    );
  } finally {
    recallSema.release();
  }
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
