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

var Compiler = function () {
  _createClass(Compiler, null, [{
    key: 'readFile',
    value: function readFile(path) {
      return fs.readFileSync(path, 'utf-8');
    }
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

  _createClass(Compiler, [{
    key: 'parseHtml',
    value: function parseHtml(html) {
      var _this = this;

      this.$ = cheerio.load(html, {
        ignoreWhitespace: true,
        xmlMode: true
      });

      this.$('template').children().each(function (index, child) {
        if (child.type === 'tag') {
          _this.cssTree = _this.resolveClass(child);
        }
      });
    }
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
  }, {
    key: 'writeFile',
    value: function writeFile() {
      var templatePath = path.resolve(__dirname, '../template/main.jade');
      var code = jade.renderFile(templatePath, { tree: this.cssTree, pretty: true });
      fs.writeFileSync('./' + new Date().getTime() + '.scss', code);
    }
  }, {
    key: 'run',
    value: function run() {
      var html = Compiler.readFile(path.resolve(this.root, this.path));
      this.parseHtml(html);
      this.writeFile();
    }
  }]);

  return Compiler;
}();

exports.default = Compiler;