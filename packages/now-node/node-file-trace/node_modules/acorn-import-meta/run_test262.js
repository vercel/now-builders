"use strict"

const path = require("path")
const run = require("test262-parser-runner")
const acorn = require("acorn")
const acornImportMeta = require(".")
const Parser = acorn.Parser.extend(acornImportMeta)

const unsupportedFeatures = [
  "BigInt",
  "class-fields",
  "class-fields-private",
  "class-fields-public",
  "optional-catch-binding",
  "regexp-lookbehind",
  "regexp-named-groups",
  "regexp-unicode-property-escapes"
]

run(
  (content, options) => Parser.parse(content, {sourceType: options.sourceType, ecmaVersion: 10}),
  {
    testsDirectory: path.dirname(require.resolve("test262/package.json")),
    skip: test => !test.attrs.features || !test.attrs.features.includes("import.meta") || unsupportedFeatures.some(f => test.attrs.features.includes(f)),
  }
)
