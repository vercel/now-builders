const path = require('path');
const testDeployment = require('../../../test/deployment/test-deployment.js');

async function main() {
  const builderPath = path.resolve(__dirname, '..');
  await testDeployment(
    builderPath,
    path.resolve(__dirname, 'fixtures/01-cowsay'),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
