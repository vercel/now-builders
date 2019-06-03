/* global expect, it */
const { buildLayer } = require('../');

describe('buildLayer', () => {
  it('should get node 10', async () => {
    const { files } = await buildLayer({ nodeVersion: '10.16.0' });
    const fileNames = new Set(Object.keys(files));
    expect(fileNames).toBeTruthy();
    expect(fileNames.size).toBeGreaterThan(0);
    expect(fileNames.has('bin/node')).toBeTruthy();
    expect(fileNames.has('bin/npm')).toBeTruthy();
  });
});
