const DEFAULTS_MODE = 'server';
const DEFAULTS_V = '7.3';

const RUNTIME_NODE8 = 'nodejs8.10';
const RUNTIME_NODE10 = 'nodejs10.x';

function getMode(config) {
  return !config || !config.mode ? DEFAULTS_MODE : config.mode;
}

function getVersion(config) {
  return !config || !config.v ? DEFAULTS_V : config.v;
}

function getPhpNpm(config) {
  const version = getVersion(config).replace('.', '');
  return `@juicyfx/php-lib-${version}`;
}

function getRuntime(config) {
  return getVersion(config) === '7.4' ? RUNTIME_NODE10 : RUNTIME_NODE8;
}

exports.getMode = getMode;
exports.getVersion = getVersion;
exports.getPhpNpm = getPhpNpm;
exports.getRuntime = getRuntime;
