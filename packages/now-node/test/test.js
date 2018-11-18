const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const nowDeploy = require('./now-deploy.js');

async function main () {
  const dirToPack = path.resolve('..');
  const tgzName = (await spawnAsync('npm', [ '--loglevel', 'warn', 'pack' ], {
    stdio: [ 'ignore', 'pipe', 'inherit' ],
    cwd: dirToPack
  })).trim();
  const tgzPath = path.join(dirToPack, tgzName);
  console.log('tgzPath', tgzPath);
  const tgzUrl = await nowDeployIndexTgz(tgzPath);
  fs.unlinkSync(tgzPath);
  console.log('tgzUrl', tgzUrl);
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
