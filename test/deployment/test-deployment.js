const assert = require('assert');
const fetch = require('node-fetch');
const fs = require('fs');
const glob = require('util').promisify(require('glob'));
const path = require('path');
const { spawn } = require('child_process');
const nowDeploy = require('./now-deploy.js');

async function testDeployment (builderPath, fixturePath) {
  const tgzName = (await spawnAsync('npm', [ '--loglevel', 'warn', 'pack' ], {
    stdio: [ 'ignore', 'pipe', 'inherit' ],
    cwd: builderPath
  })).trim();
  const tgzPath = path.join(builderPath, tgzName);
  console.log('tgzPath', tgzPath);
  const tgzUrl = await nowDeployIndexTgz(tgzPath);
  fs.unlinkSync(tgzPath);
  console.log('tgzUrl', tgzUrl);

  const globResult = await glob(`${fixturePath}/**`, { nodir: true });
  const bodies = globResult.reduce((b, f) => {
    const r = path.relative(fixturePath, f);
    b[r] = fs.readFileSync(f);
    return b;
  }, {});

  const randomness = Math.floor(Math.random() * 0x7fffffff).toString(16);
  for (const file of Object.keys(bodies)) {
    if ([ '.js', '.json' ].includes(path.extname(file))) {
      bodies[file] = Buffer.from(
        bodies[file].toString().replace(/RANDOMNESS_PLACEHOLDER/g, randomness)
      );
    }
  }

  const nowJson = JSON.parse(bodies['now.json']);
  for (const build of nowJson.builds) build.use = `https://${tgzUrl}`;
  bodies['now.json'] = Buffer.from(JSON.stringify(nowJson));
  const deploymentUrl = await nowDeploy(bodies);
  console.log('deploymentUrl', deploymentUrl);

  for (const probe of nowJson.probes) {
    console.log('testing', JSON.stringify(probe));
    const text = await fetchUrlText(`https://${deploymentUrl}${probe.path}`, {
      method: probe.method,
      body: probe.body ? JSON.stringify(probe.body) : undefined,
      headers: {
        'content-type': 'application/json'
      }
    });
    if (probe.mustInclude) {
      assert(text.includes(probe.mustInclude));
    } else {
      assert(false, 'probe must have a test condition');
    }
    console.log('ok');
  }
}

async function nowDeployIndexTgz (file) {
  const bodies = {
    'index.tgz': fs.readFileSync(file),
    'now.json': Buffer.from(JSON.stringify({ version: 2 }))
  };

  return await nowDeploy(bodies);
}

async function fetchUrlText (url, opts) {
  for (let i = 0; i < 30; i += 1) {
    const resp = await fetch(url, opts);
    const text = await resp.text();
    if (!text.includes('Join Free')) return text;
    await new Promise((r) => setTimeout(r, 1000));
  }

  return '';
}

async function spawnAsync (...args) {
  return await new Promise((resolve, reject) => {
    const child = spawn(...args);
    let result;
    if (child.stdout) {
      result = '';
      child.stdout.on('data', (chunk) => {
        result += chunk.toString();
      });
    }

    child.on('error', reject);
    child.on('close', (code, signal) => {
      if (code !== 0) {
        if (result) console.log(result);
        reject(new Error(`Exited with ${code || signal}`));
        return;
      }
      resolve(result);
    });
  });
}

module.exports = testDeployment;
