const cgi = require('./cgi');
const server = require('./server');

exports.getCgiFiles = function () {
  return cgi.getFiles();
};

exports.getCliFiles = function () {
  return cli.getFiles();
};

exports.getFpmFiles = function () {
  return fpm.getFiles();
};

exports.getServerFiles = function () {
  return server.getFiles();
};
