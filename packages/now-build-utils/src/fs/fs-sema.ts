import {
  remove as remove1,
  mkdirp as mkdirp1,
  readlink as readlink1,
  symlink as symlink1,
} from 'fs-extra';
import Sema from 'async-sema';

const sema = new Sema(20);

export async function remove(dir: string) {
  await sema.acquire();
  return remove1(dir);
}

export async function mkdirp(dir: string) {
  await sema.acquire();
  return mkdirp1(dir);
}

export async function readlink(path: string | Buffer) {
  await sema.acquire();
  return readlink1(path);
}

export async function symlink(
  srcpath: string | Buffer,
  dstpath: string | Buffer
) {
  await sema.acquire();
  return symlink1(srcpath, dstpath);
}
