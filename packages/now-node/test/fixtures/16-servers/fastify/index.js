const fastify = require('fastify')();

fastify.all('*', (request, reply) => {
  reply.send('hello from fastify:RANDOMNESS_PLACEHOLDER');
});

// fastify.server is a node's http.Server
// fastify does not have the `listen` method so we need to export this instead

module.exports = fastify.server;
