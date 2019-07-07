"use strict"

const fs = require("fs")
const path = require("path")
const run = require("test262-parser-runner")
const acorn = require("acorn")
const Parser = acorn.Parser.extend(require("."))

const unsupportedFeatures = [
  "BigInt",
  "class-methods-private",
  "class-static-fields-public",
  "class-static-fields-private",
  "class-static-methods-private"
]

const implementedFeatures = [ "class-fields-private", "class-fields-public" ]

run(
  (content, options) => Parser.parse(content, {sourceType: options.sourceType, ecmaVersion: 9}),
  {
    testsDirectory: path.dirname(require.resolve("test262/package.json")),
    skip: test => (!test.attrs.features || !implementedFeatures.some(f => test.attrs.features.includes(f)) || unsupportedFeatures.some(f => test.attrs.features.includes(f))),
    whitelist: fs.readFileSync("./test262.whitelist", "utf8").split("\n").filter(v => v && v[0] !== "#")
  }
)
