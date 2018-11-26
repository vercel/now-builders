const url = require('url');

// ! __non_webpack_require__ didn't work, so hacking the hacky hacks
const nodeRequire = eval('require'); /* eslint-disable-line */

let app;

// TODO Ensure, this happens only once
module.exports.init = async function init() {
  // TODO Install project dependencies, preferring offline

  // Dynamically load next from the CWD
  const nextPath = nodeRequire.resolve('next', {
    paths: [process.cwd(), ...require.resolve.paths('next')],
  });
  const next = nodeRequire(nextPath);

  // TODO Use process.cwd()'s next.config.js
  app = next({ dev: true });

  return app.prepare();
};

module.exports.build = async function build({ req, res }) {
  if (!app) {
    throw new Error('@now/next was not initialized');
  }

  const parsedUrl = url.parse(req.url, true);

  return app.render(req, res, req.url, parsedUrl.query, parsedUrl);
};
