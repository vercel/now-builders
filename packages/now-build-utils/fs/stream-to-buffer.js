const fastStreamToBuffer = require('fast-stream-to-buffer');

module.exports = async function streamToBuffer (stream) {
  return await new Promise((resolve, reject) => {
    fastStreamToBuffer(stream, (error, buffer) => {
      if (error) return reject(error);
      resolve(buffer);
    });
  });
};
