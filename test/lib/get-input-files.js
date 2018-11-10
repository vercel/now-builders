const glob = require('../../packages/now-build-utils/fs/glob.js');

function getInputFiles(directory) {
  return glob('**', directory)
}

module.exports = getInputFiles
