"use strict"

const fs = require("fs")
const path = require("path")
const run = require("test262-parser-runner")
const acorn = require("acorn")
const acornExportNsFrom = require(".")
const Parser = acorn.Parser.extend(acornExportNsFrom)

run(
  (content, options) => Parser.parse(content, {sourceType: options.sourceType, ecmaVersion: 10}),
  {
    testsDirectory: path.dirname(require.resolve("test262/package.json")),
    skip: test => !(test.attrs.features && test.attrs.features.includes("export-star-as-namespace-from-module") && !test.attrs.features.includes("dynamic-import")),
    whitelist: fs.readFileSync("./test262.whitelist", "utf8").split("\n").filter(v => v && v[0] !== "#")
  }
)
