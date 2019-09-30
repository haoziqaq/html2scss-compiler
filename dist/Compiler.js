'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var fs = require('fs');
var path = require('path');
var cheerio = require('cheerio');
var jade = require('jade');
var ora = require('ora'); //带标记的打印
var chalk = require('chalk'); //文字上色
var spinner = ora();

var Compiler = function () {
  _createClass(Compiler, null, [{
    key: 'readFile',

    /**
     * 读文件
     * @param path 文件地址
     * @return {*}
     */
    value: function readFile(path) {
      return fs.readFileSync(path, 'utf-8');
    }

    /**
     * 格式化html成为严格的xml
     * @param html html片段
     * @return {*}
     */

  }, {
    key: 'formatHtml',
    value: function formatHtml(html) {
      var imgReg = /<img(.*)>/g;
      var inputReg = /<input (.*)>/g;
      var brReg = /<br(.*)>/g;
      var hrReg = /<hr(.*)>/g;
      var embedReg = /<embed(.*)>/g;
      html = html.replace(imgReg, '<img $1/>').replace(inputReg, '<input $1/>').replace(brReg, '<br $1/>').replace(hrReg, '<hr $1/>').replace(embedReg, '<embed $1/>');
      return html;
    }

    /**
     * 对象数组去重
     * @param arr 数组
     * @param key 对象唯一key
     */

  }, {
    key: 'clearRepeatByKey',
    value: function clearRepeatByKey(arr, key) {
      var existKeys = [];
      var result = [];
      arr.forEach(function (item) {
        if (!existKeys.includes(item[key])) {
          result.push(item);
          existKeys.push(item[key]);
        }
      });
      return result;
    }

    /**
     * 树剪枝
     * @param children 子节点
     */

  }, {
    key: 'pruneTree',
    value: function pruneTree(children) {
      children = Compiler.clearRepeatByKey(children, 'clazz');
      console.log(children);
      return children.map(function (item, index) {
        if (item.children && item.children.length > 0) {
          item.children = Compiler.pruneTree(item.children);
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

  }]);

  function Compiler() {
    var path = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : './';
    var config = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
    var root = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : process.cwd();

    _classCallCheck(this, Compiler);

    this.path = path;
    this.config = config;
    this.root = root;
    this.$ = null;
    this.cssTree = {};
  }

  /**
   * 解析模板入口
   */


  _createClass(Compiler, [{
    key: 'parseTemplate',
    value: function parseTemplate() {
      var _this = this;

      this.$('template').children().each(function (index, child) {
        if (child.type === 'tag') {
          _this.cssTree = _this.resolveClass(child);
        }
      });
      this.cssTree.children = Compiler.pruneTree(this.cssTree.children);
    }

    /**
     * 解析html片段
     * @param html
     */

  }, {
    key: 'parseHtml',
    value: function parseHtml(html) {
      this.$ = cheerio.load(html, {
        ignoreWhitespace: true,
        xmlMode: true
      });

      var fileType = path.extname(this.path);

      if (fileType === '.vue') {
        this.parseTemplate();
      } else if (fileType === '.html' || fileType === '.php') {
        this.$ = cheerio.load('<template><div class="fragment">' + this.$('body').html() + '</div></template>', {
          ignoreWhitespace: true,
          xmlMode: true
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

  }, {
    key: 'resolveClass',
    value: function resolveClass(node) {
      var _this2 = this;

      var children = [];
      var nodeChildren = this.$(node).children();
      var clazz = this.$(node).attr('class');
      var tagName = node.name;
      if (nodeChildren.length > 0) {
        nodeChildren.each(function (index, child) {
          if (child.type === 'tag') {
            var childNode = _this2.resolveClass(child);
            var clazzList = childNode.clazz && childNode.clazz.split(' ') || [];
            //如果没有clazz 则用tagName代替
            if (clazzList.length === 0) {
              clazzList.push(childNode.tagName + ':tag');
            }
            clazzList.forEach(function (clazz, index) {
              //第一个永远为真节点，后面的兄弟节点为根据clazz数量复制出来的叶子节点
              if (index === 0) {
                childNode.clazz = clazzList[0];
                children.push(childNode);
              } else {
                children.push({
                  clazz: clazz,
                  tagName: childNode.tagName,
                  children: []
                });
              }
            });
          }
        });
      }
      return {
        clazz: clazz,
        children: children,
        tagName: tagName
      };
    }

    /**
     * 输出文件
     */

  }, {
    key: 'emitFile',
    value: function emitFile() {
      var templatePath = path.resolve(__dirname, '../template/main.jade');
      var code = jade.renderFile(templatePath, { tree: this.cssTree, pretty: true });
      fs.writeFileSync('./' + new Date().getTime() + '.scss', code);
    }

    /**
     * 执行入口
     */

  }, {
    key: 'run',
    value: function run() {
      var html = Compiler.readFile(path.resolve(this.root, this.path));
      html = Compiler.formatHtml(html);
      this.parseHtml(html);
      this.emitFile();
    }
  }]);

  return Compiler;
}();

exports.default = Compiler;