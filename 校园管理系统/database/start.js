/**
 * 启动脚本 - 同时运行 server.js 和 ai.js
 * 
 * 此脚本使用 child_process 模块来同时启动两个服务器
 * 并将它们的输出合并到主进程的控制台
 */

const { spawn } = require('child_process');
const path = require('path');
const colors = require('colors/safe');

// 定义要启动的服务
const services = [
  {
    name: 'API服务器 (server.js)',
    command: 'nodemon',
    args: ['server.js'],
    color: 'green'
  },
  {
    name: 'AI服务器 (ai.js)',
    command: 'nodemon',
    args: ['ai.js'],
    color: 'cyan'
  }
];

// 启动所有服务
services.forEach(service => {
  console.log(colors[service.color](`正在启动 ${service.name}...`));
  
  // 使用 spawn 启动子进程
  const child = spawn(service.command, service.args, {
    cwd: __dirname,
    shell: true
  });
  
  // 处理标准输出
  child.stdout.on('data', (data) => {
    const lines = data.toString().trim().split('\n');
    lines.forEach(line => {
      if (line.trim()) {
        console.log(colors[service.color](`[${service.name}] ${line}`));
      }
    });
  });
  
  // 处理标准错误
  child.stderr.on('data', (data) => {
    const lines = data.toString().trim().split('\n');
    lines.forEach(line => {
      if (line.trim()) {
        console.log(colors.red(`[${service.name}] ${line}`));
      }
    });
  });
  
  // 处理进程退出
  child.on('close', (code) => {
    if (code !== 0) {
      console.log(colors.red(`[${service.name}] 进程退出，退出码: ${code}`));
    } else {
      console.log(colors[service.color](`[${service.name}] 进程正常退出`));
    }
  });
  
  // 处理进程错误
  child.on('error', (err) => {
    console.log(colors.red(`[${service.name}] 启动失败: ${err.message}`));
  });
});

console.log(colors.yellow('所有服务已启动，按 Ctrl+C 停止所有服务'));