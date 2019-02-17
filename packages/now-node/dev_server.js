const { Bridge } = require('@now/node-bridge/bridge');
const { Server } = require('http');
const path = require('path');

const builder = require('./index');

/**
 * @param {BuildParamsType} buildParams
 * @returns {Promise<Files>}
 */
exports.build = async function nodeDevBuilder({ entrypoint, files, workPath }) {
  // ! This pretty much replicates what the original builder was doing,
  // ! except with the important exception of:
  // 1. Returning a _function_
  // 2. Listening for 1 request, then closing.
  return {
    [entrypoint]: async function nodeLambda(event) {
      // Build normally, so we have access to the files
      // TODO Build first, & only rebuild if the file(s) change
      await builder.build({ entrypoint, files, workPath });

      const listenerPath = require.resolve(
        `./${path.join('user', entrypoint)}`,
        {
          paths: [workPath],
        },
      );

      // Remove cached listener between requests
      delete require.cache[listenerPath];

      const listener = require(listenerPath);
      const bridge = new Bridge();
      const server = new Server(listener);

      return new Promise((resolve, reject) => {
        server.listen(async () => {
          const { port } = server.address();

          bridge.port = port;

          console.log(
            `Requesting ${entrypoint} from http://localhost:${port}/`,
          );

          try {
            resolve(await bridge.launcher(event));
          } catch (error) {
            console.error(error);
            bridge.userError = error;
            reject(error);
          }

          server.close();
        });
      });
    },
  };
};
