let MagicString = require('magic-string')
const { parse } = require('acorn')
const analyse = require('./ast/analyse')

function hasOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop)
}

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
    this.imports = {} //当前模块所有的导入
    this.exports = {} //当前模块所有的导出
    this.ast.body.forEach((node) => {
      if (node.type === 'ImportDeclaration') {
        const source = node.source.value //从哪个模块进行的导入
        const specifiers = node.specifiers
        specifiers.forEach((specifier) => {
          const name = specifier.imported.name //导入变量的名称
          const localName = specifier.local.name //本地变量的名字  name as myname
          //本地变量 是从哪个模块的哪个变量导出的
          this.imports[localName] = { name, localName, source }
        })
      } else if (/^Export/.test(node.type)) {
        const declaration = node.declaration
        if (declaration.type === 'VariableDeclaration') {
          const name = declaration.declarations[0].id.name
          //记录当前模块的导出 通过哪个表达式创建的
          this.exports[name] = { node, localName: name, expression: declaration }
        }
      }
    })
    analyse(this.ast, this.code, this) //找到_defines 和 _dependsOn
    // console.log('this.ast', this.ast)
    this.definitions = {} //存放着所有的全局变量 定义的语句
    this.ast.body.forEach((statement) => {
      Object.keys(statement._defines).forEach((name) => {
        this.definitions[name] = statement
      })
    })
  }
  //展开这个模块里的语句，把些语句中定义的变量的语句都放到结果里
  expandAllStatements() {
    let allStatements = []
    this.ast.body.forEach((statement) => {
      if (statement.type === 'ImportDeclaration') {
        return
      }
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
    const dependencies = Object.keys(statement._dependsOn) //外部依赖
    dependencies.forEach((name) => {
      //找到定义这个变量的声明节点 这个节点可以在当前模块内 也可能在依赖模块里
      let definition = this.define(name)
      result.push(...definition)
    })
    if (!statement.lxyincluded) {
      // Object.defineProperties(statement, {
      //   lxyincluded: true
      // })
      statement.lxyincluded = true //表示这个节点已经确定被纳入结果 里了，以后就不需要重复添加了
      //tree shaking核心在此处
      result.push(statement)
    }

    return result
  }

  define(name) {
    //查找一个导入的变量里有没有name
    if (hasOwnProperty(this.imports, name)) {
      // this.imports[localName] = { name, localName, source }
      const importData = this.imports[name]
      //获取msg模块 exports imports
      const module = this.bundle.fetchModule(importData.source, this.path)
      // this.exports[name] = { node, localName: name, expression: declaration }
      const exportData = module.exports[importData.name]
      return module.define(exportData.localName)
    } else {
      let statement = this.definitions[name]
      if (statement && !statement.lxyincluded) {
        return this.expandStatement(statement)
      } else {
        return []
      }
    }
  }
}

module.exports = Module
