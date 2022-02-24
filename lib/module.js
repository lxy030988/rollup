let MagicString = require('magic-string')
const { parse } = require('acorn')
const analyse = require('./ast/analyse')

/**
 * 每个文件都是一个模块，每个模块都会对应一个Module实例
 */
class Module {
  constructor({ code, path, bundle }) {
    this.code = new MagicString(code, { filename: path })
    this.path = path //模块的路径
    this.bundle = bundle //属于哪个bundle的实例
    this.ast = parse(code, {
      //把源代码转成抽象语法树
      ecmaVersion: 7,
      sourceType: 'module'
    })
    this.analyse()
  }
  analyse() {
    analyse(this.ast, this.code, this)
  }
  //展开这个模块里的语句，把些语句中定义的变量的语句都放到结果里
  expandAllStatements() {
    let allStatements = []
    this.ast.body.forEach((statement) => {
      let statements = this.expandStatement(statement)
      allStatements.push(...statements)
    })
    return allStatements
  }
  //展开一个节点
  //找到当前节点依赖的变量，它访问的变量，找到这些变量的声明语句。
  //这些语句可能是在当前模块声明的，也也可能是在导入的模块的声明的
  expandStatement(statement) {
    let result = []
    if (!statement._included) {
      statement._included = true //表示这个节点已经确定被纳入结果 里了，以后就不需要重复添加了
      //tree shaking核心在此处
      result.push(statement)
    }

    return result
  }
}
module.exports = Module
