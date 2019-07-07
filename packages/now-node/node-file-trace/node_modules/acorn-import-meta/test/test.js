"use strict"

const assert = require("assert")
const acorn = require("acorn")
const importMeta = require("..")
const Parser = acorn.Parser.extend(importMeta)

function testFail(text, expectedError, additionalOptions) {
  it(text, function () {
    let failed = false
    try {
      Parser.parse(text, Object.assign({ ecmaVersion: 9, sourceType: "module" }, additionalOptions))
    } catch (e) {
      if (expectedError) assert.strictEqual(e.message, expectedError)
      failed = true
    }
    assert(failed)
  })
}
function test(text, expectedResult, additionalOptions) {
  it(text, function () {
    const result = Parser.parse(text, Object.assign({ ecmaVersion: 9, sourceType: "module" }, additionalOptions))
    assert.deepStrictEqual(result, expectedResult)
  })
  testFail(text, null, { sourceType: "script" })
}

const newNode = (start, props) => Object.assign(new acorn.Node({options: {}}, start), props)

describe("acorn-import-meta", function () {
  test("const response = fetch(import.meta.url);", newNode(0, {
    type: "Program",
    end: 40,
    body: [
      newNode(0, {
        type: "VariableDeclaration",
        end: 40,
        declarations: [
          newNode(6, {
            type: "VariableDeclarator",
            end: 39,
            id: newNode(6, {
              type: "Identifier",
              end: 14,
              name: "response"
            }),
            init: newNode(17, {
              type: "CallExpression",
              end: 39,
              callee: newNode(17, {
                type: "Identifier",
                end: 22,
                name: "fetch"
              }),
              arguments: [
                newNode(23, {
                  type: "MemberExpression",
                  end: 38,
                  object: newNode(23, {
                    type: "MetaProperty",
                    end: 34,
                    meta: newNode(23, {
                      type: "Identifier",
                      end: 29,
                      name: "import"
                    }),
                    property: newNode(30, {
                      type: "Identifier",
                      end: 34,
                      name: "meta"
                    })
                  }),
                  property: newNode(35, {
                    type: "Identifier",
                    end: 38,
                    name: "url"
                  }),
                  computed: false
                })
              ]
            })
          })
        ],
        kind: "const"
      })
    ],
    sourceType: "module"
  }))
  test("const size = import.meta.scriptElement.dataset.size || 300;", newNode(0, {
    type: "Program",
    end: 59,
    body: [
      newNode(0, {
        type: "VariableDeclaration",
        end: 59,
        declarations: [
          newNode(6, {
            type: "VariableDeclarator",
            end: 58,
            id: newNode(6, {
              type: "Identifier",
              end: 10,
              name: "size"
            }),
            init: newNode(13, {
              type: "LogicalExpression",
              end: 58,
              left: newNode(13, {
                type: "MemberExpression",
                end: 51,
                object: newNode(13, {
                  type: "MemberExpression",
                  end: 46,
                  object: newNode(13, {
                    type: "MemberExpression",
                    end: 38,
                    object: newNode(13, {
                      type: "MetaProperty",
                      end: 24,
                      meta: newNode(13, {
                        type: "Identifier",
                        end: 19,
                        name: "import"
                      }),
                      property: newNode(20, {
                        type: "Identifier",
                        end: 24,
                        name: "meta"
                      })
                    }),
                    property: newNode(25, {
                      type: "Identifier",
                      end: 38,
                      name: "scriptElement"
                    }),
                    computed: false
                  }),
                  property: newNode(39, {
                    type: "Identifier",
                    end: 46,
                    name: "dataset"
                  }),
                  computed: false
                }),
                property: newNode(47, {
                  type: "Identifier",
                  end: 51,
                  name: "size"
                }),
                computed: false
              }),
              operator: "||",
              right: newNode(55, {
                type: "Literal",
                end: 58,
                value: 300,
                raw: "300"
              })
            })
          })
        ],
        kind: "const"
      })
    ],
    sourceType: "module"
  }))
  test("import.meta.resolve('something')", newNode(0, {
    type: "Program",
    end: 32,
    body: [
      newNode(0, {
        type: "ExpressionStatement",
        end: 32,
        expression: newNode(0, {
          type: "CallExpression",
          end: 32,
          callee: newNode(0, {
            type: "MemberExpression",
            end: 19,
            object: newNode(0, {
              type: "MetaProperty",
              end: 11,
              meta: newNode(0, {
                type: "Identifier",
                end: 6,
                name: "import"
              }),
              property: newNode(7, {
                type: "Identifier",
                end: 11,
                name: "meta"
              })
            }),
            property: newNode(12, {
              type: "Identifier",
              end: 19,
              name: "resolve"
            }),
            computed: false
          }),
          arguments: [
            newNode(20, {
              type: "Literal",
              end: 31,
              value: "something",
              raw: "'something'"
            })
          ]
        })
      })
    ],
    sourceType: "module"
  }))

  test("import x from 'y'", newNode(0, {
    type: "Program",
    end: 17,
    body: [
      newNode(0, {
        type: "ImportDeclaration",
        end: 17,
        specifiers: [
          newNode(7, {
            type: "ImportDefaultSpecifier",
            end: 8,
            local: newNode(7, {
              type: "Identifier",
              end: 8,
              name: "x"
            })
          })
        ],
        source: newNode(14, {
          type: "Literal",
          end: 17,
          value: "y",
          raw: "'y'"
        })
      })
    ],
    sourceType: "module"
  }))
  testFail("let x = import.anotherMeta", "The only valid meta property for import is import.meta (1:15)")
  testFail("import.m\\u0065ta;", "\"meta\" in import.meta must not contain escape sequences (1:7)")
})
