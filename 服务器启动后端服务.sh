#!/bin/bash

# 服务器上启动后端服务的脚本

echo "=== 启动后端服务 ==="
echo ""

# 检查是否在正确的目录
if [ ! -f "package.json" ]; then
    echo "❌ 错误: 未找到 package.json，请确保在 backend-api 目录中运行此脚本"
    exit 1
fi

echo "📦 检查依赖..."
if [ ! -d "node_modules" ]; then
    echo "⚠️  node_modules 不存在，正在安装依赖..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ 依赖安装失败"
        exit 1
    fi
    echo "✅ 依赖安装完成"
else
    echo "✅ node_modules 已存在"
fi

echo ""
echo "🚀 启动服务..."
npm run start:dev







