"use strict"

const assert = require("assert")

const acorn = require("acorn")
const exportNsFrom = require("..")

const Parser = acorn.Parser.extend(exportNsFrom)

const parse = testCode => Parser.parse(testCode, { ecmaVersion: 10, sourceType: "module" })

function test(testCode, ast) {
  it(testCode, () => {
    const result = parse(testCode)
    assert.deepStrictEqual(result, ast)
  })
}

function testFail(text, expectedError) {
  it(text, function () {
    let failed = false
    try {
      parse(text)
    } catch (e) {
      assert.strictEqual(e.message, expectedError)
      failed = true
    }
    assert(failed)
  })
}

const newNode = props => Object.assign(new acorn.Node({options: {}}, props.start), props)

describe("acorn-export-ns-from", () => {
  test("export * as ns from 'source';", newNode({
    type: "Program",
    start: 0,
    end: 29,
    body: [
      newNode({
        type: "ExportNamedDeclaration",
        start: 0,
        end: 29,
        declaration: null,
        specifiers: [newNode({
          type: "ExportNamespaceSpecifier",
          start: 7,
          end: 14,
          exported: newNode({
            type: "Identifier",
            start: 12,
            end: 14,
            name: "ns"
          })
        })],
        source: newNode({
          type: "Literal",
          start: 20,
          end: 28,
          value: "source",
          raw: "'source'"
        })
      })
    ],
    sourceType: "module"
  }))
  testFail("export * as ns from 'source';\nexport const ns = null;", "Duplicate export 'ns' (2:13)")
  testFail("export const ns = null;\nexport * as ns from 'source';", "Duplicate export 'ns' (2:12)")
})
