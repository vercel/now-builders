const cowsay = require('cowsay').say;

const say = text => cowsay({ text: `${text}:RANDOMNESS_PLACEHOLDER` });

module.exports = { say };
