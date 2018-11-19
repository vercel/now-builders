const path = require('path');
const testDeployment = require('../../../test/deployment/test-deployment.js');

async function main() {
  const builderPath = path.resolve(__dirname, '..');
  await testDeployment(
    builderPath,
    path.resolve(__dirname, 'fixtures/02-others'),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
