import { Bridge } from './bridge';

let shouldStoreProxyRequests: boolean = false;
// PLACEHOLDER:shouldStoreProxyRequests

const bridge = new Bridge(undefined, shouldStoreProxyRequests);

if (!process.env.NODE_ENV) {
  process.env.NODE_ENV =
    process.env.NOW_REGION === 'dev1' ? 'development' : 'production';
}

let notDone = true;

const _p = (async () => {
  try {
    // PLACEHOLDER:setServer
  } catch (err) {
    if (err.code === 'MODULE_NOT_FOUND') {
      console.error(err.message);
      console.error(
        'Did you forget to add it to "dependencies" in `package.json`?'
      );
      process.exit(1);
    } else {
      console.error(err);
      process.exit(1);
    }
  }

  await bridge.listen();

  notDone = false;
})();

exports.launcher = async (...argv: any) => {
  notDone && (await _p);
  // @ts-ignore
  return bridge.launcher(...argv);
};
