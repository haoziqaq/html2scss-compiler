const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');
const jade = require('jade');
const ora = require('ora'); //带标记的打印
const chalk = require('chalk'); //文字上色
const spinner = ora();

export default class Compiler {
  /**
   * 读文件
   * @param path 文件地址
   * @return {*}
   */
  static readFile(path) {
    return fs.readFileSync(path, 'utf-8');
  }

  /**
   * 格式化html成为严格的xml
   * @param html html片段
   * @return {*}
   */
  static formatHtml(html) {
    const imgReg = /<img(.*)>/g;
    const inputReg = /<input (.*)>/g;
    const brReg = /<br(.*)>/g;
    const hrReg = /<hr(.*)>/g;
    const embedReg = /<embed(.*)>/g;
    html = html.replace(imgReg, '<img $1/>')
      .replace(inputReg, '<input $1/>')
      .replace(brReg, '<br $1/>')
      .replace(hrReg, '<hr $1/>')
      .replace(embedReg, '<embed $1/>');
    return html;
  }

  /**
   * 对象数组去重
   * @param arr 数组
   * @param key 对象唯一key
   */
  static clearRepeatByKey(arr, key) {
    let existKeys = [];
    let result = [];
    arr.forEach((item) => {
      if (!existKeys.includes(item[key])) {
        result.push(item);
        existKeys.push(item[key])
      }
    });
    return result;
  }

  /**
   * 树剪枝
   * @param children 子节点
   */
  static pruneTree(children) {
    children = Compiler.clearRepeatByKey(children, 'clazz');
    return children.map((item, index) => {
      if (item.children && item.children.length > 0) {
        item.children = Compiler.pruneTree(item.children)
      }
      return item;
    });
  }

  /**
   * 构造函数
   * @param path 文件地址
   * @param config 配置项
   * @param root 命令执行地址
   */
  constructor(path = './', config = {}, root = process.cwd()) {
    this.path = path;
    this.config = config;
    this.root = root;
    this.$ = null;
    this.cssTree = {};
  }

  /**
   * 解析模板入口
   */
  parseTemplate() {
    this.$('template').children().each((index, child) => {
      if (child.type === 'tag') {
        this.cssTree = this.resolveClass(child);
      }
    });
    this.cssTree.children = Compiler.pruneTree(this.cssTree.children);
  }

  /**
   * 解析html片段
   * @param html
   */
  parseHtml(html) {
    this.$ = cheerio.load(html, {
      ignoreWhitespace: true,
      xmlMode: true,
    });

    const fileType = path.extname(this.path);

    if (fileType === '.vue') {
      this.parseTemplate();
    } else if (fileType === '.html' || fileType === '.php') {
      this.$ = cheerio.load(`<template><div class="fragment">${this.$('body').html()}</div></template>`, {
        ignoreWhitespace: true,
        xmlMode: true,
      });
      this.parseTemplate();
    } else {
      spinner.fail(chalk.yellow('不支持此类型文件'));
    }
  }

  /**
   * 处理节点的css-class
   * @param node
   * @return {{children: Array, tagName: *, clazz: *}}
   */
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

  /**
   * 输出文件
   */
  emitFile() {
    const templatePath = path.resolve(__dirname, '../template/main.jade');
    const code = jade.renderFile(templatePath, { tree: this.cssTree, pretty: true });
    fs.writeFileSync(`./${new Date().getTime()}.scss`, code);
  }

  /**
   * 执行入口
   */
  run() {
    let html = Compiler.readFile(path.resolve(this.root, this.path));
    html = Compiler.formatHtml(html);
    this.parseHtml(html);
    this.emitFile()
  }

}
