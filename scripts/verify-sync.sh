#!/bin/bash

# 验证同步是否成功
# 使用方法：在项目目录下运行 ./scripts/verify-sync.sh

echo "🔍 验证同步状态..."
echo ""

# 获取本地和远程的提交哈希
LOCAL_COMMIT=$(git rev-parse --short HEAD)
REMOTE_COMMIT=$(git rev-parse --short origin/main 2>/dev/null)

if [ -z "$REMOTE_COMMIT" ]; then
    echo "⚠️  无法获取远程信息，请先执行: git fetch origin"
    exit 1
fi

echo "📌 本地提交: $LOCAL_COMMIT"
echo "📌 远程提交: $REMOTE_COMMIT"
echo ""

if [ "$LOCAL_COMMIT" = "$REMOTE_COMMIT" ]; then
    echo "✅ 同步成功！本地版本与远程版本一致"
    echo ""
    echo "📝 当前版本信息："
    git log -1 --pretty=format:"   提交哈希: %h%n   提交信息: %s%n   提交时间: %cd" --date=format:"%Y-%m-%d %H:%M:%S"
else
    echo "⚠️  版本不一致！"
    echo ""
    echo "本地提交信息："
    git log -1 --pretty=format:"   %h - %s" HEAD
    echo ""
    echo "远程提交信息："
    git log -1 --pretty=format:"   %h - %s" origin/main
    echo ""
    echo "💡 建议执行: git pull origin main"
fi

echo ""
echo "📊 工作区状态："
git status --short

