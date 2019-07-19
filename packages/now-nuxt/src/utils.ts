import path from 'path';
import execa from 'execa';
import { glob, Files, File, PackageJson } from '@now/build-utils';
import { SpawnOptions } from 'child_process';

export async function exec(
  cmd: string,
  args: string[],
  options: SpawnOptions = {}
) {
  const { env = {}, ...opts } = options;
  args = args.filter(Boolean);

  console.log('Running', cmd, ...args);

  await execa(cmd, args, {
    stdout: process.stdout,
    stderr: process.stderr,
    preferLocal: true,
    env: {
      MINIMAL: '1',
      NODE_OPTIONS: '--max_old_space_size=3000',
      ...env,
    },
    ...opts,
  });
}

/**
 * Validate if the entrypoint is allowed to be used
 */
export function validateEntrypoint(entrypoint: string) {
  const filename = path.basename(entrypoint);

  if (['package.json', 'nuxt.config.js'].includes(filename) === false) {
    throw new Error(
      'Specified "src" for "@nuxt/now-builder" has to be "package.json" or "nuxt.config.js"'
    );
  }
}

function renameFiles(files: Files, renameFn: (str: string) => string) {
  const newFiles: { [key: string]: File } = {};
  for (const fileName in files) {
    newFiles[renameFn(fileName)] = files[fileName];
  }
  return newFiles;
}

async function globAndRename(
  pattern: string,
  opts: string,
  renameFn: (str: string) => string
) {
  const files = await glob(pattern, opts);
  return renameFiles(files, renameFn);
}

export function globAndPrefix(pattern: string, opts: string, prefix: string) {
  return globAndRename(pattern, opts, name => path.join(prefix, name));
}

function findNuxtDep(pkg: PackageJson) {
  const sections = ['dependencies', 'devDependencies'] as const;
  for (const section of sections) {
    for (const suffix of ['-edge', '']) {
      const name = 'nuxt' + suffix;
      const dep = pkg[section];
      if (dep) {
        const version = dep[name];
        if (version) {
          const semver = version.replace(/^[\^~><=]{1,2}/, '');
          return {
            name,
            version,
            semver,
            suffix,
            section,
          };
        }
      }
    }
  }
  return undefined;
}

export function preparePkgForProd(pkg: PackageJson) {
  // Ensure fields exist
  if (!pkg.dependencies) {
    pkg.dependencies = {};
  }
  if (!pkg.devDependencies) {
    pkg.devDependencies = {};
  }

  // Find nuxt dependency
  const nuxtDependency = findNuxtDep(pkg);
  if (!nuxtDependency) {
    throw new Error('No nuxt dependency found in package.json');
  }

  // Remove nuxt form dependencies
  for (const distro of ['nuxt', 'nuxt-start']) {
    for (const suffix of ['-edge', '']) {
      delete pkg.dependencies[distro + suffix];
    }
  }

  // Delete all devDependencies
  delete pkg.devDependencies;

  // Add @nuxt/core to dependencies
  pkg.dependencies['@nuxt/core' + nuxtDependency.suffix] =
    nuxtDependency.version;

  // Return nuxtDependency
  return nuxtDependency;
}

let _step: string | undefined;
let _stepStartTime: [number, number] | undefined;

const dash = ' ----------------- ';

export function startStep(step: string) {
  endStep();
  console.log(dash + step + dash);
  _step = step;
  _stepStartTime = process.hrtime();
}

function hrToMs(hr: [number, number] | undefined) {
  const hrTime = process.hrtime(hr);
  return (hrTime[0] * 1e9 + hrTime[1]) / 1e6;
}

export function endStep() {
  if (!_step) {
    return;
  }
  console.log(`${_step} took: ${hrToMs(_stepStartTime)} ms`);
  _step = undefined;
  _stepStartTime = undefined;
}
