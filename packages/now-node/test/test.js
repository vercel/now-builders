const fs = require('fs');
const glob = require('util').promisify(require('glob'));
const path = require('path');
const { spawn } = require('child_process');
const nowDeploy = require('./now-deploy.js');

async function main () {
  const dirToPack = path.resolve(__dirname, '..');
  const tgzName = (await spawnAsync('npm', [ '--loglevel', 'warn', 'pack' ], {
    stdio: [ 'ignore', 'pipe', 'inherit' ],
    cwd: dirToPack
  })).trim();
  const tgzPath = path.join(dirToPack, tgzName);
  console.log('tgzPath', tgzPath);
  const tgzUrl = await nowDeployIndexTgz(tgzPath);
  fs.unlinkSync(tgzPath);
  console.log('tgzUrl', tgzUrl);

  const fixtureDir = path.resolve(__dirname, 'fixtures/01');
  const globResult = await glob(`${fixtureDir}/**`, { nodir: true });
  const bodies = globResult.reduce((b, f) => {
    const r = path.relative(fixtureDir, f);
    b[r] = fs.readFileSync(f);
    return b;
  }, {});

  const nowJson = JSON.parse(bodies['now.json']);
  for (const build of nowJson.builds) build.use = `https://${tgzUrl}`;
  bodies['now.json'] = Buffer.from(JSON.stringify(nowJson));

  const randomness = Math.floor(Math.random() * 0x7fffffff).toString(16);
  for (const file of Object.keys(bodies)) {
    if ([ '.js', '.json' ].includes(path.extname(file))) {
      bodies[file] = Buffer.from(
        bodies[file].toString().replace(/RANDOMNESS_PLACEHOLDER/, randomness)
      );
    }
  }

  console.log(await nowDeploy(bodies));
}

async function nowDeployIndexTgz (file) {
  const bodies = {
    'index.tgz': fs.readFileSync(file),
    'now.json': Buffer.from(JSON.stringify({ version: 2 }))
  };

  return await nowDeploy(bodies);
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

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
