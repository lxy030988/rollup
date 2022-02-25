const Scope = require('./scope')
const walk = require('./walk')

/**
 * 找出当前模块用到了哪些变量
 * 还要知道哪些变量是当前模块声明的   哪些变量是从别的模块导入的
 * @param {*} ast 语法树
 * @param {*} magicString 源代码
 * @param {*} module 属于哪个模块
 */
function analyse(ast, magicString, module) {
  let scope = new Scope() //先创建一个模块内的全局作用域

  //遍历body下面的顶级节点
  ast.body.forEach((statement) => {
    //给作用域添加变量
    function addToScope(declaration) {
      const name = declaration.id.name //获得这个声明的变量
      scope.add(name) //把say这个变量 添加打当前的全局作用域中
      if (!scope.parent) {
        //当前是全局作用域
        statement._defines[name] = true //在全局作用域下 声明了一个全局的变量
      }
    }

    Object.defineProperties(statement, {
      _defines: { value: {} }, //存档当前模块定义的所有的全局变量
      _dependsOn: { value: {} }, //存档当前模块没有定义 但是 使用到的变量 （外部导入的变量）
      _included: { value: false, writable: false }, //此语句是否已经被包含到打包结果中了

      //start指的是此节点在源代码中的起始索引,end就是结束索引
      //magicString.snip返回的还是magicString 实例clone
      _source: { value: magicString.snip(statement.start, statement.end) }
    })

    //构建作用域链
    walk(statement, {
      enter(node) {
        let newScope
        switch (node.type) {
          case 'FunctionDeclaration':
            const params = node.params.map((item) => item.name)
            addToScope(node)
            newScope = new Scope({
              parent: scope, //父作用域 就是当前作用域
              params
            })
            break
          case 'VariableDeclaration': //并不会生成一个新的作用域
            node.declarations.forEach(addToScope)
            break
          default:
            break
        }
        if (newScope) {
          //当前节点声明了一个新的作用域  在这个节点放一个_scope 指向新的作用域
          Object.defineProperty(node, '_scope', { value: newScope })
          scope = newScope
        }
      },
      leave(node) {
        if (node._scope) {
          //如果此节点产生了一个新的作用域  那么等离开这个节点 scope回到父级作用域
          scope = scope.parent
        }
      }
    })
  })

  //找出外部导入的变量
  ast.body.forEach((statement) => {
    walk(statement, {
      enter(node) {
        if (node._scope) {
          //这个节点有新的作用域 就用新的作用域
          scope = node._scope
        }
        if (node.type === 'Identifier') {
          const definingScope = scope.findDefiningScope(node.name)
          if (!definingScope) {
            statement._dependsOn[node.name] = true
          }
        }
      },
      leave(node) {
        if (node._scope) {
          //如果此节点产生了一个新的作用域  那么等离开这个节点 scope回到父级作用域
          scope = scope.parent
        }
      }
    })
  })
}

module.exports = analyse
