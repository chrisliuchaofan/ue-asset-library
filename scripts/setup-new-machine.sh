#!/bin/bash

# 双电脑同步 - 新机器一键设置脚本
# 使用方法：在另一台电脑上，克隆仓库后运行此脚本

echo "🚀 开始设置新机器..."

# 获取脚本所在目录（项目根目录）
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "📁 项目目录: $PROJECT_DIR"

# 进入项目目录
cd "$PROJECT_DIR"

# 检查是否在正确的目录
if [ ! -f "package.json" ]; then
    echo "❌ 错误: 未找到 package.json，请确保在项目根目录运行此脚本"
    exit 1
fi

echo "📦 安装依赖..."
npm install

echo "✅ 设置完成！"
echo ""
echo "📝 下一步："
echo "1. 配置环境变量（如果需要）：复制 .env.local.example 为 .env.local 并填写配置"
echo "2. 运行开发服务器：npm run dev"
echo ""
echo "🔄 日常同步命令："
echo "  开始工作前: git pull origin main"
echo "  完成工作后: git add -A && git commit -m '你的提交信息' && git push origin main"

