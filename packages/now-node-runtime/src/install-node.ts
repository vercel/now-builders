import { basename, join } from 'path';
import fetch from 'node-fetch';
import { extract } from 'tar';
import pipe from 'promisepipe';
import { createWriteStream } from 'fs-extra';
import { unzip, zipFromFile } from './unzip';

export async function installNode(
  dest: string,
  version: string,
  platform: string = process.platform,
  arch: string = process.arch
): Promise<void> {
  const tarballUrl = generateNodeTarballUrl(version, platform, arch);
  console.log('Downloading from ' + tarballUrl);
  console.log('Downloading to ' + dest);
  const res = await fetch(tarballUrl);
  if (!res.ok) {
    throw new Error(`HTTP request failed: ${res.status}`);
  }
  if (platform === 'win32') {
    // Put it in the `bin` dir for consistency with the tarballs
    const finalDest = join(dest, 'bin');
    const zipName = basename(tarballUrl);
    const zipPath = join(dest, zipName);

    await pipe(
      res.body,
      createWriteStream(zipPath)
    );

    const zipFile = await zipFromFile(zipPath);
    await unzip(zipFile, finalDest, { strip: 1 });
  } else {
    const extractStream = extract({ strip: 1, C: dest });
    if (!extractStream.destroy) {
      // If there is an error in promisepipe,
      // it expects a destroy method
      extractStream.destroy = () => {};
    }
    await pipe(
      res.body,
      extractStream
    );
  }
}

export function generateNodeTarballUrl(
  version: string,
  platform: string = process.platform,
  arch: string = process.arch
): string {
  if (!version.startsWith('v')) {
    version = `v${version}`;
  }
  let ext: string;
  let plat: string;
  if (platform === 'win32') {
    ext = 'zip';
    plat = 'win';
  } else {
    ext = 'tar.gz';
    plat = platform;
  }
  return `https://nodejs.org/dist/${version}/node-${version}-${plat}-${arch}.${ext}`;
}
