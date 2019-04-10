const crypto = require('crypto');
const fs = require('fs-extra');
const path = require('path');
const { Sema } = require('async-sema');

const { glob } = require('@now/build-utils'); // eslint-disable-line import/no-extraneous-dependencies

const DIR_FLYING_SHUTTLE = '.flying-shuttle';
const DIR_CHUNKS_NAME = 'chunks';
const DIR_LAMBDAS_NAME = 'lambdas';
const EMPTY = Object.freeze({});

const FILE_MANIFEST = 'compilation-modules.json';
const FILE_BUILD_ID = 'HEAD_BUILD_ID';

const recallSema = new Sema(1);

module.exports.recallLambda = async function recallLambda({
  entryPath,
  entryDirectory,
  pageName,
  onLambda,
}) {
  const lambdaPageName = pageName === '/' ? '/index' : pageName;

  const pagePath = path.join(
    entryPath,
    DIR_FLYING_SHUTTLE,
    DIR_LAMBDAS_NAME,
    `${lambdaPageName}.json`,
  );
  if (!(await fs.pathExists(pagePath))) {
    throw new Error(
      `[FLYING SHUTTLE] failed shuttle :: unable to find page: ${lambdaPageName}`,
    );
  }

  const lambda = JSON.parse(await fs.readFile(pagePath, 'utf8'));
  Object.keys(lambda).forEach((lambdaKey) => {
    if (lambda[lambdaKey].type !== 'Buffer') {
      return;
    }

    lambda[lambdaKey] = Buffer.from(lambda[lambdaKey].data);
  });

  onLambda(path.join(entryDirectory, lambdaPageName), lambda);

  await this.stageLambda({ entryPath, pageName: lambdaPageName, lambda });

  const flyingShuttlePath = path.join(entryPath, DIR_FLYING_SHUTTLE);
  const currentPath = path.join(entryPath, '.next');

  const shuttleManifestPath = path.join(flyingShuttlePath, FILE_MANIFEST);
  const currentManifestPath = path.join(currentPath, FILE_MANIFEST);
  const shuttleBuildIdPath = path.join(flyingShuttlePath, FILE_BUILD_ID);
  const currentBuildIdPath = path.join(currentPath, 'static', FILE_BUILD_ID);

  const recallPageKey = path.isAbsolute(pageName) ? pageName : `/${pageName}`;

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

    const recallPage = recallPages[recallPageKey];

    const movedPageChunks = [];
    const rewriteRegex = new RegExp(`${shuttleBuildId}[\\/\\\\]`);
    await Promise.all(
      recallPageChunks[recallPageKey].map(async (recallFileName) => {
        if (!rewriteRegex.test(recallFileName)) {
          if (!(await fs.pathExists(path.join(currentPath, recallFileName)))) {
            await fs.copy(
              path.join(flyingShuttlePath, DIR_CHUNKS_NAME, recallFileName),
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
        }
        movedPageChunks.push(newFileName);
      }),
    );

    await fs.writeJson(
      currentManifestPath,
      Object.assign(currentManifest, {
        pages: Object.assign(pages, { [recallPageKey]: recallPage }),
        pageChunks: Object.assign(pageChunks, {
          [recallPageKey]: movedPageChunks,
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
