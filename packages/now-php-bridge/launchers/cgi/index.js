const FileFsRef = require('@now/build-utils/file-fs-ref.js');
const path = require('path');

function getFiles() {
  return {
    'launcher.js': new FileFsRef({
      fsPath: path.join(__dirname, 'launcher.js'),
    }),
  };
}

module.exports = {
  getFiles,
};
