#!/usr/bin/env node
const program = require('commander'); //捕获指令
const ora = require('ora'); //带标记的打印
const inquirer = require('inquirer'); //交互
const chalk = require('chalk'); //文字上色
const spinner = ora();
const Compiler = require('./dist/Compiler').default;
const path = require('path');

program.version('1.0.0', '-v, --version')
  .command('c')
  .action(r => {
    inquirer.prompt([
      {
        type: 'input',
        message: '请输入编译的文件相对路径(带文件名和后缀)',
        name: 'filePath'
      }
    ]).then((result) => {
      const filePath = result.filePath;
      if (path.extname(filePath)) {
        new Compiler(filePath).run();
      } else {
        spinner.fail(chalk.red('路径有误，请检查是否带了文件后缀名'));
      }
    });
  });

program.parse(process.argv);
