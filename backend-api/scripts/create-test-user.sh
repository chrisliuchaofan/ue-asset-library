#!/bin/bash

# 在服务器上创建测试用户的脚本

echo "=== 创建测试用户 ==="
echo ""

cd "$(dirname "$0")/.." || exit 1

# 检查 .env 文件
if [ ! -f ".env" ]; then
    echo "❌ 错误: 未找到 .env 文件"
    exit 1
fi

echo "📦 检查依赖..."
if [ ! -d "node_modules" ]; then
    echo "正在安装依赖..."
    npm install
fi

echo ""
echo "🚀 运行创建用户脚本..."
npx ts-node scripts/create-test-user.ts


