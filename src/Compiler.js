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
      xmlMode: true
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
    if (nodeChildren.length > 0) {
      nodeChildren.each((index, child) => {
        if (child.type === 'tag') {
          const childNode = this.resolveClass(child);
          const clazzList = (childNode.clazz && childNode.clazz.split(' ')) || [];
          if (clazzList.length === 0 && childNode.children.length > 0) {
            clazzList.push('_');
          }
          clazzList.forEach((clazz, index) => {
            if (index === 0) {
              childNode.clazz = clazzList[0];
              children.push(childNode);
            } else {
              children.push({
                clazz,
                children: [],
              })
            }
          });
        }
      });
    }
    return {
      clazz,
      children
    }
  }

  writeFile() {
    const templatePath = path.resolve(__dirname, '../template/main.jade');
    const code = jade.renderFile(templatePath, { tree: this.cssTree, pretty: true });
    fs.writeFileSync('./index.scss', code);
  }

  run() {
    const html = Compiler.readFile(path.resolve(this.root, this.path));
    this.parseHtml(html);
    this.writeFile()

  }

}
