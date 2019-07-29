const { homedir, tmpdir } = require('os');
const { join } = require('path');
const fs = require('fs-extra');
const createDeployment = require('now-client').default;
const fetch = require('./fetch-retry.js');

const str = 'aHR0cHM6Ly9hcGktdG9rZW4tZmFjdG9yeS56ZWl0LnNo';

async function nowDeploy (bodies, randomness) {
  if (!randomness) {
    randomness = Math.random()
      .toString()
      .slice(2);
  }
  const nowJson = JSON.parse(bodies['now.json']);
  bodies['now.json'] = Buffer.from(
    JSON.stringify({
      name: 'test',
      version: 2,
      public: true,
      env: { ...nowJson.env, RANDOMNESS_ENV_VAR: randomness },
      build: {
        env: {
          ...(nowJson.build || {}).env,
          RANDOMNESS_BUILD_ENV_VAR: randomness,
        },
      },
      builds: nowJson.builds || [],
      routes: nowJson.routes || [],
    })
  );
  const tmpDir = join(tmpdir(), randomness);
  await fs.mkdir(tmpDir);

  await Promise.all(
    Object.keys(bodies).map(async (name) => {
      const buffer = bodies[name];
      const absolutePath = join(tmpDir, name);
      await fs.outputFile(absolutePath, buffer);
    })
  );

  const token = await getToken(randomness);
  const { error, deployment } = await deployFromFileSystem(tmpDir, token);
  if (error) {
    throw new Error(
      `Deployment ${deployment} failed with error ${JSON.stringify(error)}`
    );
  }

  console.log({
    id: deployment.id,
    url: `https://${deployment.url}`,
  });

  await fs.remove(tmpDir);

  return { deploymentId: deployment.id, deploymentUrl: deployment.url };
}

async function deployFromFileSystem (dir, token) {
  let error;
  let deployment;
  for await (const event of createDeployment(dir, { token })) {
    if (event.type === 'created') {
      deployment = event.payload;
    } else if (event.type === 'ready') {
      deployment = event.payload;
    } else if (event.type === 'error') {
      error = event.payload;
    }
  }
  return { error, deployment };
}

let token;
let currentCount = 0;
const MAX_COUNT = 10;

async function getToken (randomness) {
  const { NOW_TOKEN, CIRCLECI } = process.env;
  currentCount += 1;
  if (!token || currentCount === MAX_COUNT) {
    currentCount = 0;
    if (NOW_TOKEN) {
      token = NOW_TOKEN;
    } else if (CIRCLECI) {
      token = await fetchTokenWithRetry(
        `${Buffer.from(str, 'base64').toString()}?${randomness}`
      );
    } else {
      const authJsonPath = join(homedir(), '.now/auth.json');
      token = require(authJsonPath).token;
    }
  }
  return token;
}

async function fetchWithAuth (url, opts = {}) {
  if (!opts.headers) opts.headers = {};

  if (!opts.headers.Authorization) {
    const bearer = await getToken();
    opts.headers.Authorization = `Bearer ${bearer}`;
  }

  return await fetchApi(url, opts);
}

function fetchTokenWithRetry (url, retries = 3) {
  return new Promise(async (resolve, reject) => {
    try {
      const res = await fetch(url);
      const data = await res.json();
      resolve(data.token);
    } catch (error) {
      console.log(`Failed to fetch token. Retries remaining: ${retries}`);
      if (retries === 0) {
        reject(error);
        return;
      }
      setTimeout(() => {
        fetchTokenWithRetry(url, retries - 1)
          .then(resolve)
          .catch(reject);
      }, 500);
    }
  });
}

async function fetchApi (url, opts = {}) {
  const apiHost = process.env.API_HOST || 'api.zeit.co';
  const urlWithHost = `https://${apiHost}${url}`;
  const { method = 'GET', body } = opts;

  if (process.env.VERBOSE) {
    console.log('fetch', method, url);
    if (body) console.log(encodeURIComponent(body).slice(0, 80));
  }

  if (!opts.headers) opts.headers = {};

  if (!opts.headers.Accept) {
    opts.headers.Accept = 'application/json';
  }

  opts.headers['x-now-trace-priority'] = '1';

  return await fetch(urlWithHost, opts);
}

module.exports = {
  fetchApi,
  fetchWithAuth,
  nowDeploy,
};
