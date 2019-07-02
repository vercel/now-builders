import path from 'path';
import fs from 'fs-extra';

function getCustomData(importName: string) {
  return `
module.exports = async function(...args) {
  const original = require('./${importName}');

  const finalConfig = {};

  if (typeof original === 'function' && original.constructor.name === 'AsyncFunction') {
    Object.assign(finalConfig, await original(...args));
  } else if (typeof original === 'function') {
    Object.assign(finalConfig, original(...args));
  } else if (typeof original === 'object') {
    Object.assign(finalConfig, original);
  }

  return Object.assign(finalConfig, { target: 'serverless' });
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
