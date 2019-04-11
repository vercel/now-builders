/* global beforeAll, expect, it, jest, test */
/* eslint-disable import/no-extraneous-dependencies */
const fs = require('fs');
const path = require('path');
const buildUtils = require('@now/build-utils');

const { shouldServe } = require('../dist');

const {
  packAndDeploy,
  testDeployment,
} = require('../../../test/lib/deployment/test-deployment.js');

jest.setTimeout(4 * 60 * 1000);
const buildUtilsUrl = '@canary';
let builderUrl;

beforeAll(async () => {
  const builderPath = path.resolve(__dirname, '..');
  builderUrl = await packAndDeploy(builderPath);
  console.log('builderUrl', builderUrl);
});

const fixturesPath = path.resolve(__dirname, 'fixtures');

// eslint-disable-next-line no-restricted-syntax
for (const fixture of fs.readdirSync(fixturesPath)) {
  // eslint-disable-next-line no-loop-func
  it(`should build ${fixture}`, async () => {
    await expect(
      testDeployment(
        { builderUrl, buildUtilsUrl },
        path.join(fixturesPath, fixture),
      ),
    ).resolves.toBeDefined();
  });
}

test('shouldServe on 01-cowsay', async () => {
  const cwd = path.resolve(__dirname, './fixtures/01-cowsay');
  const files = await buildUtils.glob('**', cwd);

  expect(
    shouldServe({
      files,
      entrypoint: 'index.js',
      requestPath: 'index.js',
    }),
  ).toBe(true);

  expect(
    shouldServe({
      files,
      entrypoint: 'index.js',
      requestPath: '',
    }),
  ).toBe(true);

  expect(
    shouldServe({
      files,
      entrypoint: 'index.js',
      requestPath: '/',
    }),
  ).toBe(true);

  expect(
    shouldServe({
      files,
      entrypoint: 'index.js',
      requestPath: 'subdirectory/index.js',
    }),
  ).toBe(false);

  expect(
    shouldServe({
      files,
      entrypoint: 'subdirectory/index.js',
      requestPath: 'subdirectory/',
    }),
  ).toBe(true);

  expect(
    shouldServe({
      files,
      entrypoint: 'subdirectory/index.js',
      requestPath: 'subdirectory',
    }),
  ).toBe(true);
});
