import {
  remove as remove1,
  mkdirp as mkdirp1,
  readlink as readlink1,
  symlink as symlink1,
  lstat as lstat1,
  stat as stat1,
  chmod as chmod1,
  pathExists as pathExists1,
  readFile as readFile1,
  Stats,
} from 'fs-extra';
import Sema from 'async-sema';

const sema = new Sema(20);

export { Stats };

export async function remove(dir: string) {
  await sema.acquire();
  try {
    return remove1(dir);
  } finally {
    sema.release();
  }
}

export async function mkdirp(dir: string) {
  await sema.acquire();
  try {
    return mkdirp1(dir);
  } finally {
    sema.release();
  }
}

export async function readlink(path: string | Buffer) {
  await sema.acquire();
  try {
    return readlink1(path);
  } finally {
    sema.release();
  }
}

export async function symlink(
  srcpath: string | Buffer,
  dstpath: string | Buffer
) {
  await sema.acquire();
  try {
    return symlink1(srcpath, dstpath);
  } finally {
    sema.release();
  }
}

export async function lstat(path: string | Buffer) {
  await sema.acquire();
  try {
    return lstat1(path);
  } finally {
    sema.release();
  }
}

export async function stat(path: string | Buffer) {
  await sema.acquire();
  try {
    return stat1(path);
  } finally {
    sema.release();
  }
}

export async function chmod(path: string | Buffer, mode: string | number) {
  await sema.acquire();
  try {
    return chmod1(path, mode);
  } finally {
    sema.release();
  }
}

export async function pathExists(path: string) {
  await sema.acquire();
  try {
    return pathExists1(path);
  } finally {
    sema.release();
  }
}

export async function readFile(
  file: string | number | Buffer,
  encoding: string
) {
  await sema.acquire();
  try {
    return readFile1(file, encoding);
  } finally {
    sema.release();
  }
}
