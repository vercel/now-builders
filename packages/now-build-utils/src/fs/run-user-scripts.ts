import assert from 'assert';
import fs from 'fs-extra';
import path from 'path';
import { spawn, SpawnOptions } from 'child_process';

let g = {
  npmBin: 'npm',
  yarnBin: 'yarn',
};

function spawnAsync(
  command: string,
  args: string[],
  cwd: string,
  opts: SpawnOptions = {}
) {
  return new Promise<void>((resolve, reject) => {
    const stderrLogs: Buffer[] = [];
    opts = { stdio: 'inherit', cwd, ...opts };
    const child = spawn(command, args, opts);

    if (opts.stdio === 'pipe') {
      child.stderr.on('data', data => stderrLogs.push(data));
    }

    child.on('error', reject);
    child.on('close', (code, signal) => {
      if (code === 0) {
        return resolve();
      }

      const errorLogs = stderrLogs.map(line => line.toString()).join('');
      if (opts.stdio !== 'inherit') {
        reject(new Error(`Exited with ${code || signal}\n${errorLogs}`));
      } else {
        reject(new Error(`Exited with ${code || signal}`));
      }
    });
  });
}

async function chmodPlusX(fsPath: string) {
  const s = await fs.stat(fsPath);
  const newMode = s.mode | 64 | 8 | 1; // eslint-disable-line no-bitwise
  if (s.mode === newMode) return;
  const base8 = newMode.toString(8).slice(-3);
  await fs.chmod(fsPath, base8);
}

/**
 * Undocumented API for now-cli. Not for public usage at this time.
 */
export function setScriptGlobals(opts: Partial<typeof g>) {
  const input = opts as { [key: string]: string };
  const output = g as { [key: string]: string };
  Object.keys(input).forEach(key => {
    output[key] = input[key];
  });
}

export async function runShellScript(fsPath: string) {
  assert(path.isAbsolute(fsPath));
  const destPath = path.dirname(fsPath);
  await chmodPlusX(fsPath);
  await spawnAsync(`./${path.basename(fsPath)}`, [], destPath);
  return true;
}

async function scanParentDirs(destPath: string, scriptName?: string) {
  assert(path.isAbsolute(destPath));

  let hasScript = false;
  let hasPackageLockJson = false;
  let currentDestPath = destPath;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const packageJsonPath = path.join(currentDestPath, 'package.json');
    // eslint-disable-next-line no-await-in-loop
    if (await fs.pathExists(packageJsonPath)) {
      // eslint-disable-next-line no-await-in-loop
      const packageJson = JSON.parse(
        await fs.readFile(packageJsonPath, 'utf8')
      );
      hasScript = Boolean(
        packageJson.scripts && scriptName && packageJson.scripts[scriptName]
      );
      // eslint-disable-next-line no-await-in-loop
      hasPackageLockJson = await fs.pathExists(
        path.join(currentDestPath, 'package-lock.json')
      );
      break;
    }

    const newDestPath = path.dirname(currentDestPath);
    if (currentDestPath === newDestPath) break;
    currentDestPath = newDestPath;
  }

  return { hasScript, hasPackageLockJson };
}

export async function installDependencies(
  destPath: string,
  args: string[] = []
) {
  assert(path.isAbsolute(destPath));

  let commandArgs = args;
  console.log(`installing to ${destPath}`);
  const { hasPackageLockJson } = await scanParentDirs(destPath);

  const opts = {
    env: {
      ...process.env,
      // This is a little hack to force `node-gyp` to build for the
      // Node.js version that `@now/node` and `@now/node-server` use
      npm_config_target: '8.10.0',
    },
    stdio: 'pipe',
  };

  if (hasPackageLockJson) {
    commandArgs = args.filter(a => a !== '--prefer-offline');
    await spawnAsync(
      g.npmBin,
      ['install'].concat(commandArgs),
      destPath,
      opts as SpawnOptions
    );
  } else {
    await spawnAsync(
      g.yarnBin,
      ['--cwd', destPath].concat(commandArgs),
      destPath,
      opts as SpawnOptions
    );
  }
}

export async function runPackageJsonScript(
  destPath: string,
  scriptName: string,
  opts?: SpawnOptions
) {
  assert(path.isAbsolute(destPath));
  const { hasScript, hasPackageLockJson } = await scanParentDirs(
    destPath,
    scriptName
  );
  if (!hasScript) return false;

  if (hasPackageLockJson) {
    console.log(`running "npm run ${scriptName}"`);
    await spawnAsync(g.npmBin, ['run', scriptName], destPath, opts);
  } else {
    console.log(`running "yarn run ${scriptName}"`);
    await spawnAsync(
      g.yarnBin,
      ['--cwd', destPath, 'run', scriptName],
      destPath,
      opts
    );
  }

  return true;
}

export const runNpmInstall = installDependencies;
