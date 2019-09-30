const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');
const jade = require('jade');

export default class Compiler {
  static readFile(path) {
    return fs.readFileSync(path, 'utf-8');
  }

  constructor(path = './', config = {}, root = process.cwd()) {
    this.path = path;
    this.config = config;
    this.root = root;
    this.$ = null;
    this.cssTree = {};
  }

  parseHtml(html) {
    this.$ = cheerio.load(html, {
      ignoreWhitespace: true,
      xmlMode: true,
    });

    this.$('template').children().each((index, child) => {
      if (child.type === 'tag') {
        this.cssTree = this.resolveClass(child);
      }
    });
  }

  resolveClass(node) {
    let children = [];
    const nodeChildren = this.$(node).children();
    const clazz = this.$(node).attr('class');
    const tagName = node.name;
    if (nodeChildren.length > 0) {
      nodeChildren.each((index, child) => {
        if (child.type === 'tag') {
          const childNode = this.resolveClass(child);
          const clazzList = (childNode.clazz && childNode.clazz.split(' ')) || [];
          //如果没有clazz 则用tagName代替
          if (clazzList.length === 0) {
            clazzList.push(childNode.tagName + ':tag');
          }
          clazzList.forEach((clazz, index) => {
            //第一个永远为真节点，后面的兄弟节点为根据clazz数量复制出来的叶子节点
            if (index === 0) {
              childNode.clazz = clazzList[0];
              children.push(childNode);
            } else {
              children.push({
                clazz,
                tagName: childNode.tagName,
                children: [],
              })
            }
          });
        }
      });
    }
    return {
      clazz,
      children,
      tagName
    }
  }

  writeFile() {
    const templatePath = path.resolve(__dirname, '../template/main.jade');
    const code = jade.renderFile(templatePath, { tree: this.cssTree, pretty: true });
    fs.writeFileSync(`./${new Date().getTime()}.scss`, code);
  }

  run() {
    const html = Compiler.readFile(path.resolve(this.root, this.path));
    this.parseHtml(html);
    this.writeFile()

  }

}
