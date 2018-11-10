const streamToBuffer = require('fast-stream-to-buffer');

module.exports = async function (stream) {
  return await new Promise((resolve, reject) => {
    streamToBuffer(stream, (error, buffer) => {
      if (error) return reject(error);
      resolve(buffer);
    });
  });
};
