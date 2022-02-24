function analyse(ast, magicString, module) {
  ast.body.forEach((statement) => {
    //body下面的顶级节点
    Object.defineProperties(statement, {
      //start指的是此节点在源代码中的起始索引,end就是结束索引
      //magicString.snip返回的还是magicString 实例clone
      _source: { value: magicString.snip(statement.start, statement.end) }
    })
  })
}

module.exports = analyse
