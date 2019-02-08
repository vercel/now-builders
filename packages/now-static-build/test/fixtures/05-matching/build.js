const fs = require('fs');
const path = require('path');

const cowsay = require('cowsay');

for (let i = 1; i < 10; i += 1) {
  const file = path.join(__dirname, `dist/${i}.html`);
  fs.writeFileSync(file, `<h1>Number ${i}:RANDOMNESS_PLACEHOLDER</h1>`);
}

const file = path.join(__dirname, 'dist/cow.txt');
fs.writeFileSync(file, cowsay.say({ text: 'cow:RANDOMNESS_PLACEHOLDER' }));
