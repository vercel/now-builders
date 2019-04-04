// This file was copied (and changed to js) from https://github.com/zeit/next.js/blob/6ac079f13044e82e7bc4df4138bb6cb834d94a46/packages/next/lib/recursive-delete.ts

const fs = require('fs');
const { join } = require('path');
const { promisify } = require('util');

const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const rmdir = promisify(fs.rmdir);
const unlink = promisify(fs.unlink);
const sleep = promisify(setTimeout);

const unlinkFile = async (p, t = 1) => {
  try {
    return await unlink(p);
  } catch (e) {
    if (
      (e.code === 'EBUSY'
        || e.code === 'ENOTEMPTY'
        || e.code === 'EPERM'
        || e.code === 'EMFILE')
      && t < 3
    ) {
      await sleep(t * 100);
      return unlinkFile(p, t + 1);
    }

    if (e.code === 'ENOENT') {
      return null;
    }

    throw e;
  }
};

async function recursiveDelete(dir, filter, ensure) {
  let result;
  try {
    result = await readdir(dir);
  } catch (e) {
    if (e.code === 'ENOENT' && !ensure) return;

    throw e;
  }

  await Promise.all(
    result.map(async (part) => {
      const absolutePath = join(dir, part);
      const pathStat = await stat(absolutePath).catch((e) => {
        if (e.code !== 'ENOENT') throw e;
      });
      if (!pathStat) return null;

      if (pathStat.isDirectory()) {
        await recursiveDelete(absolutePath, filter);
        return rmdir(absolutePath);
      }

      if (!filter || filter.test(part)) {
        return unlinkFile(absolutePath);
      }

      return null;
    }),
  );
}

module.exports = recursiveDelete;
