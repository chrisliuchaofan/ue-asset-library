#!/bin/bash

# 分支管理辅助脚本
# 使用方法：./scripts/branch-helper.sh <命令> [参数]

set -e

# 颜色定义
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 显示帮助信息
show_help() {
    echo "分支管理辅助脚本"
    echo ""
    echo "使用方法："
    echo "  ./scripts/branch-helper.sh <命令> [参数]"
    echo ""
    echo "命令："
    echo "  start <分支名>     - 开始新功能开发（创建分支并切换）"
    echo "  list              - 列出所有分支"
    echo "  current           - 显示当前分支"
    echo "  sync              - 同步 main 分支（拉取最新代码）"
    echo "  merge <分支名>     - 合并功能分支到 main"
    echo "  delete <分支名>    - 删除本地分支"
    echo "  cleanup           - 清理已合并的分支"
    echo ""
    echo "示例："
    echo "  ./scripts/branch-helper.sh start feature/asset-search"
    echo "  ./scripts/branch-helper.sh merge feature/asset-search"
    echo "  ./scripts/branch-helper.sh list"
}

# 开始新功能开发
start_feature() {
    local branch_name=$1
    
    if [ -z "$branch_name" ]; then
        echo -e "${RED}错误：请提供分支名称${NC}"
        echo "示例：./scripts/branch-helper.sh start feature/asset-search"
        exit 1
    fi
    
    echo -e "${BLUE}🚀 开始新功能开发：$branch_name${NC}"
    echo ""
    
    # 切换到 main
    echo "📌 切换到 main 分支..."
    git checkout main
    
    # 拉取最新代码
    echo "📥 拉取最新代码..."
    git pull origin main
    
    # 创建并切换分支
    echo "🌿 创建分支：$branch_name"
    git checkout -b "$branch_name"
    
    echo ""
    echo -e "${GREEN}✅ 已创建并切换到分支：$branch_name${NC}"
    echo -e "${YELLOW}💡 提示：开始开发后，使用以下命令提交：${NC}"
    echo "   git add -A"
    echo "   git commit -m \"feat: 你的提交信息\""
    echo "   git push -u origin $branch_name"
}

# 列出所有分支
list_branches() {
    echo -e "${BLUE}📋 分支列表：${NC}"
    echo ""
    
    echo "本地分支："
    git branch
    
    echo ""
    echo "远程分支："
    git branch -r
    
    echo ""
    echo -e "${YELLOW}当前分支：${NC}"
    git branch --show-current
}

# 显示当前分支
show_current() {
    local current=$(git branch --show-current)
    local commit=$(git rev-parse --short HEAD)
    local msg=$(git log -1 --pretty=format:"%s")
    
    echo -e "${BLUE}📌 当前分支信息：${NC}"
    echo "  分支：$current"
    echo "  提交：$commit"
    echo "  信息：$msg"
}

# 同步 main 分支
sync_main() {
    echo -e "${BLUE}🔄 同步 main 分支...${NC}"
    echo ""
    
    # 保存当前分支
    local current_branch=$(git branch --show-current)
    
    # 切换到 main
    git checkout main
    
    # 拉取最新代码
    echo "📥 拉取最新代码..."
    git pull origin main
    
    echo ""
    echo -e "${GREEN}✅ main 分支已同步${NC}"
    
    # 如果之前在功能分支，提示切换回去
    if [ "$current_branch" != "main" ]; then
        echo ""
        echo -e "${YELLOW}💡 提示：你之前在 $current_branch 分支${NC}"
        echo "   切换回去：git checkout $current_branch"
    fi
}

# 合并功能分支
merge_feature() {
    local branch_name=$1
    
    if [ -z "$branch_name" ]; then
        echo -e "${RED}错误：请提供要合并的分支名称${NC}"
        echo "示例：./scripts/branch-helper.sh merge feature/asset-search"
        exit 1
    fi
    
    echo -e "${BLUE}🔀 合并分支：$branch_name${NC}"
    echo ""
    
    # 检查分支是否存在
    if ! git show-ref --verify --quiet refs/heads/"$branch_name"; then
        echo -e "${RED}错误：分支 $branch_name 不存在${NC}"
        exit 1
    fi
    
    # 确保在 main 分支
    local current=$(git branch --show-current)
    if [ "$current" != "main" ]; then
        echo "📌 切换到 main 分支..."
        git checkout main
    fi
    
    # 拉取最新代码
    echo "📥 拉取最新代码..."
    git pull origin main
    
    # 合并分支
    echo "🔀 合并 $branch_name 到 main..."
    if git merge "$branch_name"; then
        echo ""
        echo -e "${GREEN}✅ 合并成功！${NC}"
        echo ""
        echo -e "${YELLOW}💡 下一步：${NC}"
        echo "   git push origin main"
        echo "   git branch -d $branch_name  # 删除本地分支（可选）"
    else
        echo ""
        echo -e "${RED}❌ 合并失败，有冲突需要解决${NC}"
        echo "   解决冲突后："
        echo "   git add <冲突文件>"
        echo "   git commit"
    fi
}

# 删除分支
delete_branch() {
    local branch_name=$1
    
    if [ -z "$branch_name" ]; then
        echo -e "${RED}错误：请提供要删除的分支名称${NC}"
        exit 1
    fi
    
    if [ "$branch_name" = "main" ]; then
        echo -e "${RED}错误：不能删除 main 分支${NC}"
        exit 1
    fi
    
    local current=$(git branch --show-current)
    if [ "$current" = "$branch_name" ]; then
        echo "📌 切换到 main 分支..."
        git checkout main
    fi
    
    echo -e "${YELLOW}⚠️  删除分支：$branch_name${NC}"
    read -p "确认删除？(y/N) " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        git branch -d "$branch_name" 2>/dev/null || git branch -D "$branch_name"
        echo -e "${GREEN}✅ 已删除本地分支：$branch_name${NC}"
        echo ""
        echo -e "${YELLOW}💡 提示：删除远程分支：${NC}"
        echo "   git push origin --delete $branch_name"
    else
        echo "已取消"
    fi
}

# 清理已合并的分支
cleanup_branches() {
    echo -e "${BLUE}🧹 清理已合并的分支...${NC}"
    echo ""
    
    # 切换到 main
    git checkout main
    
    # 获取已合并的分支（排除 main 和当前分支）
    local merged=$(git branch --merged | grep -v "main" | grep -v "^\*" | sed 's/^[ ]*//')
    
    if [ -z "$merged" ]; then
        echo -e "${GREEN}✅ 没有需要清理的分支${NC}"
        return
    fi
    
    echo "已合并的分支："
    echo "$merged"
    echo ""
    read -p "删除这些分支？(y/N) " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "$merged" | xargs -n 1 git branch -d
        echo -e "${GREEN}✅ 已清理完成${NC}"
    else
        echo "已取消"
    fi
}

# 主逻辑
case "$1" in
    start)
        start_feature "$2"
        ;;
    list)
        list_branches
        ;;
    current)
        show_current
        ;;
    sync)
        sync_main
        ;;
    merge)
        merge_feature "$2"
        ;;
    delete)
        delete_branch "$2"
        ;;
    cleanup)
        cleanup_branches
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        echo -e "${RED}错误：未知命令 '$1'${NC}"
        echo ""
        show_help
        exit 1
        ;;
esac

