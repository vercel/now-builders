const MemoryFileSystem = require('memory-fs');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const yarnPath = require('shelljs')
  .which('yarn')
  .toString();

const cachePath = spawnSync(yarnPath, ['cache', 'dir'])
  .stdout.toString()
  .trim();
spawnSync(yarnPath, ['cache', 'clean']);
const vfs = new MemoryFileSystem();

const saveCreateWriteStream = fs.createWriteStream;
fs.createWriteStream = (...args) => {
  const filename = args[0];
  const relative = path.relative(cachePath, filename);
  if (relative.startsWith('..')) {
    return saveCreateWriteStream.call(fs, ...args);
  }

  vfs.mkdirpSync(path.dirname(filename));
  fs.writeFileSync(filename, Buffer.alloc(0));
  const stream = vfs.createWriteStream(...args);

  stream.on('finish', () => {
    setTimeout(() => {
      stream.emit('close');
    });
  });

  return stream;
};

const saveReadFile = fs.readFile;
fs.readFile = (...args) => {
  const filename = args[0];
  const relative = path.relative(cachePath, filename);
  if (relative.startsWith('..')) {
    return saveReadFile.call(fs, ...args);
  }

  const callback = args[args.length - 1];
  return vfs.readFile(...args.slice(0, -1), (error, result) => {
    if (error) {
      saveReadFile.call(fs, ...args);
      return;
    }

    callback(error, result);
  });
};

const saveCopyFile = fs.copyFile;
fs.copyFile = (...args) => {
  const src = args[0];
  const relative = path.relative(cachePath, src);
  if (relative.startsWith('..')) {
    return saveCopyFile.call(fs, ...args);
  }

  const dest = args[1];
  const callback = args[args.length - 1];
  const buffer = vfs.readFileSync(src);
  return fs.writeFile(dest, buffer, callback);
};

const saveWriteFile = fs.writeFile;
fs.writeFile = (...args) => {
  const filename = args[0];
  const relative = path.relative(cachePath, filename);
  if (relative.startsWith('..')) {
    return saveWriteFile.call(fs, ...args);
  }

  return vfs.writeFile(...args);
};

require(yarnPath);
