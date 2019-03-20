import eos from 'end-of-stream';

function streamToBuffer(stream: NodeJS.ReadableStream) {
  return new Promise<Buffer>((resolve, reject) => {
    const buffers: Buffer[] = [];

    stream.on('data', buffers.push.bind(buffers))

    eos(stream, (err) => {
        if (err) {
          reject(err);
          return;
        }
        switch (buffers.length) {
          case 0:
            resolve(Buffer.allocUnsafe(0));
            break;
          case 1:
            resolve(buffers[0]);
            break;
          default:
            resolve(Buffer.concat(buffers));
        }
    });
  });
}

export default streamToBuffer;
module.exports = streamToBuffer;