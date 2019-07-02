import path from 'path';
import fs from 'fs-extra';

function getCustomData(importName: string) {
  return `
module.exports = function(...args) {
  const original = require('./${importName}');

  const finalConfig = {};

  if (typeof original === 'function' && original.constructor.name === 'AsyncFunction') {
    // Special case for promises
    return original(...args)
      .then((orignalConfig) => Object.assign(finalConfig, orignalConfig))
      .then((config) => Object.assign(config, { target: 'serverless' }));
  } else if (typeof original === 'function') {
    Object.assign(finalConfig, original(...args));
  } else if (typeof original === 'object') {
    Object.assign(finalConfig, original);
  }

  Object.assign(finalConfig, { target: 'serverless' });

  return finalConfig;
}
  `.trim();
}

function getDefaultData() {
  return `module.exports = { target: 'serverless' };`;
}

export default async function createServerlessConfig(workPath: string) {
  const configPath = path.join(workPath, 'next.config.js');
  const backupConfigName = `next.config.original.${Date.now()}.js`;
  const backupConfigPath = path.join(workPath, backupConfigName);

  if (fs.existsSync(configPath)) {
    await fs.rename(configPath, backupConfigPath);
    await fs.writeFile(configPath, getCustomData(backupConfigName));
  } else {
    await fs.writeFile(configPath, getDefaultData());
  }
}
