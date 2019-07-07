"use strict"

const tt = require("acorn").tokTypes

const skipWhiteSpace = /(?:\s|\/\/.*|\/\*[^]*?\*\/)*/g

const nextTokenIsDot = parser => {
  skipWhiteSpace.lastIndex = parser.pos
  let skip = skipWhiteSpace.exec(parser.input)
  let next = parser.pos + skip[0].length
  return parser.input.slice(next, next + 1) === "."
}

module.exports = function(Parser) {
  return class extends Parser {
    parseExprAtom(refDestructuringErrors) {
      if (this.type !== tt._import || !nextTokenIsDot(this)) return super.parseExprAtom(refDestructuringErrors)

      if (!this.options.allowImportExportEverywhere && !this.inModule) {
        this.raise(this.start, "'import' and 'export' may appear only with 'sourceType: module'")
      }

      let node = this.startNode()
      node.meta = this.parseIdent(true)
      this.expect(tt.dot)
      node.property = this.parseIdent(true)
      if (node.property.name !== "meta") {
        this.raiseRecoverable(node.property.start, "The only valid meta property for import is import.meta")
      }
      if (this.containsEsc) {
        this.raiseRecoverable(node.property.start, "\"meta\" in import.meta must not contain escape sequences")
      }
      return this.finishNode(node, "MetaProperty")
    }

    parseStatement(context, topLevel, exports) {
      if (this.type !== tt._import || !nextTokenIsDot(this)) {
        return super.parseStatement(context, topLevel, exports)
      }

      let node = this.startNode()
      let expr = this.parseExpression()
      return this.parseExpressionStatement(node, expr)
    }
  }
}
