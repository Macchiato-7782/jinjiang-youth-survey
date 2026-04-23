#!/bin/bash

echo "============================================"
echo "   晋江青年婚育观念调查系统"
echo "============================================"
echo ""
echo "正在启动服务器..."
echo ""

# 检查Node.js是否安装
if ! command -v node &> /dev/null; then
    echo "错误: 未检测到Node.js，请先安装Node.js (https://nodejs.org/)"
    exit 1
fi

# 检查依赖是否安装
if [ ! -d "node_modules" ]; then
    echo "正在安装依赖..."
    npm install
fi

# 启动服务器
npm start
