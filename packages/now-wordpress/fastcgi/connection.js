/* eslint-disable */

'use strict';

// copied from fastcgi-client

var net = require('net');
var EventEmitter = require('events').EventEmitter;

var MSG_TYPE = require('./consts').MSG_TYPE;
var PROTOCOL_STATUS = require('./consts').PROTOCOL_STATUS;
var stringifykv = require('./stringifykv');

var PADDING_BUFS = [
	Buffer.alloc(0),
	Buffer.from('\0'),
	Buffer.from('\0\0'),
	Buffer.from('\0\0\0'),
	Buffer.from('\0\0\0\0'),
	Buffer.from('\0\0\0\0\0'),
	Buffer.from('\0\0\0\0\0\0'),
	Buffer.from('\0\0\0\0\0\0\0'),
];

module.exports = function(client){
	// init connect
	var conn = new EventEmitter();
	var connected = false;

	var _options = client._sockFile ? { path: client._sockFile } : {port: client._port, host: client._host};
	// socket basis
	var socket = net.createConnection(_options, function(){
		socket.setKeepAlive(true);
		connected = true;
		conn.emit('connect');
	});
	socket.on('error', function(e){
		connected = false;
		conn.emit('error', e);
	});
	socket.on('end', function(){
		conn.emit('end');
	});
	socket.on('close', function(){
		conn.emit('close');
	});
	conn.end = function(){
		socket.end();
	};

	// send message
	conn.send = function(msgType, reqId, obj, cb){
		if(!connected) return;
		cb = cb || function(){};
		var data = obj;
		if(data === null) {
			// null
			data = PADDING_BUFS[0];
		} else if(! (obj instanceof Buffer)) {
			// kv pairs
			data = stringifykv(obj);
		}
		var len = data.length;
		var sendMessage = function(data, start, end){
			var contentLen = end - start;
			var paddingLen = (8 - (contentLen % 8)) % 8;
			if(start || end !== len) data = data.slice(start, end);
			var buf = Buffer.alloc(8);
			buf.writeUInt8(1, 0, true);
			buf.writeUInt8(msgType, 1, true);
			buf.writeUInt16BE(reqId, 2, true);
			buf.writeUInt16BE(contentLen, 4, true);
			buf.writeUInt8(paddingLen, 6, true);
			buf.writeUInt8(0, 7, true);
			socket.write(buf);
			if(paddingLen) {
				socket.write(data);
				socket.write(PADDING_BUFS[paddingLen], cb);
			} else {
				socket.write(data, cb);
			}
		};
		for(var start=0; start < len - 0xffff; start += 0xffff) {
			sendMessage(data, start, start + 0xffff);
		}
		sendMessage(data, start, len);
	};

	// receive message
	var expectLen = 8;
	var restDataBufs = [];
	var restDataLen = 0;
	var msgType = 0;
	var reqId = 0;
	var restBodyLen = 0;
	var restPaddingLen = 0;
	var processDataBuffer = function(buf, start, len){
//console.log('msgType', msgType, restBodyLen, buf.slice(start, start + len).toString());
		if(restBodyLen) {
			// in body
			if(len < restBodyLen) {
				restBodyLen -= len;
				conn.emit('message-' + msgType, reqId, buf.slice(start, start + len));
				return len;
			}
			var rest = restBodyLen;
			restBodyLen = 0;
			conn.emit('message-' + msgType, reqId, buf.slice(start, start + rest));
			if(!restPaddingLen) expectLen = 8;
			return rest;
		}
		if(restPaddingLen) {
			// in padding
			if(len < restPaddingLen) {
				restPaddingLen -= len;
				return len;
			}
			var rest = restPaddingLen;
			restPaddingLen = 0;
			expectLen = 8;
			return rest;
		}
		// head
		var headData = buf.slice(start, start + 8);
		if(headData.readUInt8(0, true) !== 1) {
			conn.emit('error', new Error('The server does not speak a compatible FastCGI protocol.'));
			connected = false;
			socket.end();
			return;
		}
		msgType = headData.readUInt8(1, true);
		reqId = headData.readUInt16BE(2, true);
		restBodyLen = headData.readUInt16BE(4, true);
		restPaddingLen = headData.readUInt8(6, true);
		if(msgType === MSG_TYPE.FCGI_GET_VALUES_RESULT || msgType === MSG_TYPE.FCGI_END_REQUEST) {
			expectLen = restBodyLen + restPaddingLen;
		} else {
			expectLen = 0;
		}
		return 8;
	};
	socket.on('data', function(data){
		// check expect length
		if(data.length + restDataLen < expectLen) {
			restDataBufs.push(data);
			restDataLen += data.length;
			return;
		}
		var buf = data;
		var len = buf.length;
		if(restDataBufs.length) {
			restDataBufs.push(data);
			len = restDataLen + data.length;
			buf = Buffer.concat(restDataBufs, len);
			restDataBufs = [];
			restDataLen = 0;
		}
		// process segment by segment
		var start = 0;
		var len = buf.length;
		while(len > 0) {
			var offset = processDataBuffer(buf, start, len);
			start += offset;
			len -= offset;
		}
	});

	return conn;
};
