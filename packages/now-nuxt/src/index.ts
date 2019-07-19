import * as build from './build';
import * as prepareCache from './prepare-cache';

// Docs: https://zeit.co/docs/v2/deployments/builders/developer-guide/
module.exports = {
  version: 2,
  build,
  prepareCache,
};
