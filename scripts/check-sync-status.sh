#!/bin/bash

# 检查本地版本与远程版本是否一致
# 使用方法：在项目目录下运行 ./scripts/check-sync-status.sh

echo "🔍 检查版本同步状态..."
echo ""

# 获取当前提交信息
CURRENT_COMMIT=$(git rev-parse HEAD)
CURRENT_COMMIT_SHORT=$(git rev-parse --short HEAD)
CURRENT_COMMIT_MSG=$(git log -1 --pretty=format:"%s")

echo "📌 当前本地版本："
echo "   提交哈希: $CURRENT_COMMIT_SHORT"
echo "   提交信息: $CURRENT_COMMIT_MSG"
echo ""

# 获取远程信息
echo "🌐 获取远程信息..."
git fetch origin --quiet 2>/dev/null

REMOTE_COMMIT=$(git rev-parse origin/main 2>/dev/null)
REMOTE_COMMIT_SHORT=$(git rev-parse --short origin/main 2>/dev/null)
REMOTE_COMMIT_MSG=$(git log -1 --pretty=format:"%s" origin/main 2>/dev/null)

if [ -z "$REMOTE_COMMIT" ]; then
    echo "❌ 无法连接到远程仓库，请检查网络和SSH配置"
    exit 1
fi

echo "📌 远程仓库版本："
echo "   提交哈希: $REMOTE_COMMIT_SHORT"
echo "   提交信息: $REMOTE_COMMIT_MSG"
echo ""

# 比较版本
if [ "$CURRENT_COMMIT" = "$REMOTE_COMMIT" ]; then
    echo "✅ 本地版本与远程版本一致！"
    echo ""
    
    # 检查是否有未提交的更改
    if [ -n "$(git status --porcelain)" ]; then
        echo "⚠️  但有未提交的本地更改："
        git status --short
    else
        echo "✨ 工作区干净，无未提交的更改"
    fi
else
    echo "⚠️  本地版本与远程版本不一致！"
    echo ""
    
    # 检查本地是否领先
    LOCAL_AHEAD=$(git rev-list --left-only --count HEAD...origin/main 2>/dev/null)
    REMOTE_AHEAD=$(git rev-list --right-only --count HEAD...origin/main 2>/dev/null)
    
    if [ "$LOCAL_AHEAD" -gt 0 ]; then
        echo "📤 本地有 $LOCAL_AHEAD 个提交未推送"
        echo "   建议执行: git push origin main"
    fi
    
    if [ "$REMOTE_AHEAD" -gt 0 ]; then
        echo "📥 远程有 $REMOTE_AHEAD 个提交未拉取"
        echo "   建议执行: git pull origin main"
    fi
    
    echo ""
    echo "📊 差异详情："
    echo "   本地独有的提交："
    git log --oneline HEAD ^origin/main 2>/dev/null | head -5 || echo "   (无)"
    echo ""
    echo "   远程独有的提交："
    git log --oneline origin/main ^HEAD 2>/dev/null | head -5 || echo "   (无)"
fi

echo ""
echo "💡 提示：在另一台电脑上运行相同命令，比较提交哈希即可确认版本是否一致"

