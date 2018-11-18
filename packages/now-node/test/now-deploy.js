const assert = require('assert');
const { createHash } = require('crypto');
const fetch = require('node-fetch');
const { homedir } = require('os');
const path = require('path');

const API_URL = 'https://api.zeit.co';

async function nowDeploy (bodies) {
  const files = Object.keys(bodies)
    .filter((n) => {
      return n !== 'now.json';
    })
    .map((n) => ({
      sha: digestOfFile(bodies[n]),
      size: bodies[n].length,
      file: n,
      mode: path.extname(n) === '.sh' ? 0o100755 : 0o100644
    }));

  const nowJson = JSON.parse(bodies['now.json']);

  const nowDeployPayload = {
    version: 2,
    env: {},
    name: 'test',
    files,
    builds: nowJson.builds,
    routes: [],
    meta: {}
  };

  for (const { file: filename } of files) {
    const json = await filePost(
      bodies[filename],
      digestOfFile(bodies[filename])
    );
    if (json.error) throw new Error(json.error.message);
  }

  {
    const json = await deploymentPost(nowDeployPayload);
    if (json.error && json.error.code === 'missing_files') throw new Error('Missing files');
    return json.url;
  }
}

function digestOfFile (body) {
  return createHash('sha1')
    .update(body)
    .digest('hex');
}

async function filePost (body, digest) {
  assert(Buffer.isBuffer(body));

  const headers = {
    'Content-Type': 'application/octet-stream',
    'Content-Length': body.length,
    'x-now-digest': digest,
    'x-now-size': body.length
  };

  const resp = await fetchWithAuth(`${API_URL}/v2/now/files`, {
    method: 'POST',
    headers,
    body
  });
  return await resp.json();
}

async function deploymentPost (payload) {
  const resp = await fetchWithAuth(`${API_URL}/v6/now/deployments?forceNew=1`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
  const json = await resp.json();
  if (json.error) throw new Error(json.error.message);
  return json;
}

async function fetchWithAuth (url, opts = {}) {
  if (!opts.headers) opts.headers = {};
  const { token } = require(path.join(homedir(), '.now/auth.json'));
  opts.headers.Authorization = `Bearer ${token}`;
  return await fetchApiWithChecks(url, opts);
}

async function fetchApiWithChecks (url, opts = {}) {
  const { method = 'GET', body, prefix } = opts;
  console.log(`[${prefix || ''}] fetch`, method, url);
  if (body) console.log(encodeURIComponent(body).slice(0, 80));
  const resp = await fetch(url, opts);
  return resp;
}

module.exports = nowDeploy;
