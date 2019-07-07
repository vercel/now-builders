# export namespace from support for Acorn

[![NPM version](https://img.shields.io/npm/v/acorn-export-ns-from.svg)](https://www.npmjs.org/package/acorn-export-ns-from)

This is a plugin for [Acorn](http://marijnhaverbeke.nl/acorn/) - a tiny, fast JavaScript parser, written completely in JavaScript.

It implements support for export namespace from as defined in the proposal [Add \`export * as ns from "mod"\` to Export production and Module Semantic](https://github.com/tc39/ecma262/pull/1174). The emitted AST follows [ESTree](https://github.com/leebyron/ecmascript-more-export-from/blob/master/ESTree.md).

## Usage

This module provides a plugin that can be used to extend the Acorn `Parser` class:

```javascript
const {Parser} = require('acorn');
const acornExportNsFrom = require('acorn-export-ns-from');
Parser.extend(acornExportNsFrom).parse('export * as ns from "source"');
```

## License

This plugin is released under an [MIT License](./LICENSE).
