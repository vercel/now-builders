const express = require('express');
const http = require('http');

const app = express();

app.all('*', (req, res) => {
  res.send('hello from express:RANDOMNESS_PLACEHOLDER');
});

const server = http.createServer(app);

module.exports = server;
