#!/bin/bash

# 启动后端服务脚本

cd "$(dirname "$0")/backend-api" || exit 1

echo "当前目录: $(pwd)"
echo "正在启动后端服务..."
echo ""

# 检查 node_modules 是否存在
if [ ! -d "node_modules" ]; then
    echo "⚠️  node_modules 不存在，正在安装依赖..."
    npm install
    echo ""
fi

# ⚠️ 强制设置 PORT=3001（确保使用正确的端口）
# 这会覆盖任何其他环境变量设置
export PORT=3001
echo "✅ 已设置 PORT=3001（本地开发环境）"
echo ""

# 启动服务
npm run start:dev


