# Support for import.meta in Acorn

[![NPM version](https://img.shields.io/npm/v/acorn-import-meta.svg)](https://www.npmjs.org/package/acorn-import-meta)

This is a plugin for [Acorn](http://marijnhaverbeke.nl/acorn/) - a tiny, fast JavaScript parser, written completely in JavaScript.

It implements support for import.meta as defined in the [corresponding stage 3 proposal](https://github.com/tc39/proposal-import-meta). The emitted AST follows [ESTree](https://github.com/estree/estree/blob/master/es2015.md#metaproperty).

## Usage

This module provides a plugin that extends the Acorn `Parser` class:

```javascript
var acorn = require('acorn');
var importMeta = require('acorn-import-meta');
acorn.Parser.extend(importMeta).parse('console.log(import.meta.url)');
```

## License

This plugin is released under an [MIT License](./LICENSE).
