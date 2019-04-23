/* global expect, it, jest */
const path = require('path');
const os = require('os');
const { build } = require('@now/next');
const { FileBlob } = require('@now/build-utils');

jest.setTimeout(20000);

describe('build meta dev', () => {
  const files = {
    'next.config.js': new FileBlob({
      mode: 0o777,
      data: `
      module.exports = {
        target: 'serverless'
      }
    `,
    }),
    'pages/index.js': new FileBlob({
      mode: 0o777,
      data: `
      export default () => 'Index page'
    `,
    }),
    'package.json': new FileBlob({
      mode: 0o777,
      data: `
      {
        "scripts": {
          "now-build": "next build"
        },
        "dependencies": {
          "next": "8",
          "react": "16",
          "react-dom": "16"
        }
      }
    `,
    }),
  };
  const entrypoint = 'next.config.js';
  const workPath = path.join(
    os.tmpdir(),
    Math.random()
      .toString()
      .slice(3),
  );
  console.log('workPath directory: ', workPath);

  it('should have builder v2 response', async () => {
    const meta = { isDev: false, requestPath: null };
    const { output, routes, watch } = await build({
      files,
      workPath,
      entrypoint,
      meta,
    });
    console.log('output: ', Object.keys(output));
    expect(Object.keys(output).length).toBe(3);
    expect(output.index.type).toBe('Lambda');
    expect(routes.length).toBe(0);
    expect(watch.length).toBe(0);
  });
});
