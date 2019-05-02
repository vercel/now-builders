const { downloadAndInstallPip } = require('./download-and-install-pip');

downloadAndInstallPip()
  .then(() => console.log('Done'))
  .catch(e => console.error(e));
