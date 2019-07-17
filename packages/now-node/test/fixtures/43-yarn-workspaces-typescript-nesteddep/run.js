const nodeFileTrace = require('@zeit/node-file-trace');

const workPath = process.cwd();
const input = 'api/index.js';

nodeFileTrace([input], {
  base: workPath,
  ts: true,
}).then(({ fileList, warnings }) => {
  console.log(fileList.join('\n'));
  console.log(warnings);
});
