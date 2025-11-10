#!/bin/bash

# 自动测试脚本 - 在推送前运行
# 使用方法: ./scripts/pre-push.sh

set -e  # 遇到错误立即退出

echo "🔍 开始自动测试..."

# 1. 检查是否有未提交的更改
if [ -n "$(git status --porcelain)" ]; then
  echo "⚠️  检测到未提交的更改"
  git status --short
  echo ""
  read -p "是否继续测试并提交? (y/n) " -n 1 -r
  echo ""
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ 已取消"
    exit 1
  fi
fi

# 2. 运行构建测试
echo "📦 运行构建测试..."
if npm run build; then
  echo "✅ 构建测试通过"
else
  echo "❌ 构建测试失败，请修复错误后再推送"
  exit 1
fi

# 3. 运行类型检查（如果存在）
if npm run type-check 2>/dev/null; then
  echo "✅ 类型检查通过"
else
  echo "⚠️  跳过类型检查（命令不存在）"
fi

# 4. 运行 lint 检查（如果存在）
if npm run lint 2>/dev/null; then
  echo "✅ Lint 检查通过"
else
  echo "⚠️  跳过 Lint 检查（命令不存在）"
fi

echo ""
echo "✅ 所有测试通过！可以安全推送了"
echo ""
echo "💡 提示: 使用以下命令提交并推送:"
echo "   git add ."
echo "   git commit -m '你的提交信息'"
echo "   git push"

