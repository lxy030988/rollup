var MagicString = require('magic-string')
let magicString = new MagicString('export var name = "zhufeng"')
//类似于截取字符串
console.log(magicString.snip(0, 6).toString())

//从开始到结束删除字符串(索引永远是基于原始的字符串，而非改变后的)
console.log(magicString.remove(0, 7).toString())

//很多模块，把它们打包在一个文件里，需要把很多文件的源代码合并在一起
let bundleString = new MagicString.Bundle()
bundleString.addSource({
  content: 'var a = 1;',
  separator: '\n'
})
bundleString.addSource({
  content: 'var b = 2;',
  separator: '\n'
})
/* let str = '';
str += 'var a = 1;\n'
str += 'var b = 2;\n'
console.log(str); */
console.log(bundleString.toString())
