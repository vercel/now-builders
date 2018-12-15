/* eslint-disable no-bitwise,no-use-before-define */

const assert = require('assert');
const { freeParser } = require('_http_common');
const createConnection = require('./connection.js');
const { MSG_TYPE, PROTOCOL_STATUS } = require('./consts.js');

const { HTTPParser } = process.binding('http_parser');
const BEGIN_REQUEST_DATA_KEEP_CONN = Buffer.from('\0\x01\x01\0\0\0\0\0'); // FCGI_ROLE_RESPONDER && FCGI_KEEP_CONN
const MESSAGE_FCGI_STDOUT = `message-${MSG_TYPE.FCGI_STDOUT}`;
const MESSAGE_FCGI_STDERR = `message-${MSG_TYPE.FCGI_STDERR}`;
const MESSAGE_FCGI_END_REQUEST = `message-${MSG_TYPE.FCGI_END_REQUEST}`;

let curReqId = 0;
let connection;

async function connect() {
  assert(!connection);

  const newConnection = createConnection({
    _host: '104.248.245.166',
    _port: 9000,
  });

  await new Promise((resolve, reject) => {
    function onError() {
      cleanup();
      reject();
    }
    function onConnect() {
      connection = newConnection;
      cleanup();
      resolve();
    }

    newConnection.on('error', onError);
    newConnection.on('connect', onConnect);
    function cleanup() {
      newConnection.removeListener('error', onError);
      newConnection.removeListener('connect', onConnect);
    }
  });
}

function query({ params, stdin }) {
  return new Promise((resolve) => {
    assert(connection);

    const chunks = [
      Buffer.from('HTTP/1.1 200 MAKES-PARSER-WORK\n'),
    ];

    function onError(error) {
      // TODO resolve 500 + error.message
    }
    function onStdout(reqId, data) {
      chunks.push(data);
    }
    function onStderr(reqId, data) {
      console.error(data.toString().trim());
    }
    function onEndRequest(reqId, data) {
      const protocolStatus = data.readUInt8(4, true);
      if (protocolStatus !== PROTOCOL_STATUS.FCGI_REQUEST_COMPLETE) {
        console.error('protocolStatus', protocolStatus);
        // TODO resolve 500
      }

      const response = Buffer.concat(chunks);
      const parser = new HTTPParser(HTTPParser.RESPONSE);

      let tuples = [];
      parser[HTTPParser.kOnHeadersComplete | 0] = (major, minor, t) => {
        tuples = t;
      };

      let body;
      parser[HTTPParser.kOnBody | 0] = (b, start, len) => {
        body = b.slice(start, start + len);
      };

      parser.execute(response);
      freeParser(parser);
      cleanup();
      resolve({ tuples, body });
    }

    connection.on('error', onError);
    connection.on(MESSAGE_FCGI_STDOUT, onStdout);
    connection.on(MESSAGE_FCGI_STDERR, onStderr);
    connection.on(MESSAGE_FCGI_END_REQUEST, onEndRequest);
    function cleanup() {
      connection.removeListener('error', onError);
      connection.removeListener(MESSAGE_FCGI_STDOUT, onStdout);
      connection.removeListener(MESSAGE_FCGI_STDERR, onStderr);
      connection.removeListener(MESSAGE_FCGI_END_REQUEST, onEndRequest);
    }

    curReqId += 1;
    connection.send(MSG_TYPE.FCGI_BEGIN_REQUEST, curReqId, BEGIN_REQUEST_DATA_KEEP_CONN);
    connection.send(MSG_TYPE.FCGI_PARAMS, curReqId, params);
    connection.send(MSG_TYPE.FCGI_PARAMS, curReqId, null);
    connection.send(MSG_TYPE.FCGI_STDIN, curReqId, null);
  });
}

module.exports = {
  connect,
  query,
};
