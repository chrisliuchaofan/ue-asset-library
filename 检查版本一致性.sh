#!/bin/bash

# 检查前后端版本一致性

echo "🔍 检查前后端版本一致性"
echo ""

# 1. 检查本地代码版本
echo "📦 本地代码版本（最新 commit）："
cd "$(dirname "$0")"
LOCAL_COMMIT=$(git log --oneline -1 | awk '{print $1}')
LOCAL_MESSAGE=$(git log --oneline -1 | awk '{for(i=2;i<=NF;i++) printf "%s ", $i; print ""}')
echo "  Commit: $LOCAL_COMMIT"
echo "  Message: $LOCAL_MESSAGE"
echo ""

# 2. 检查前端部署版本（Vercel）
echo "🌐 前端部署版本（Vercel）："
echo "  访问：https://vercel.com/chrisliuchaofan/ue-asset-library/deployments"
echo "  查看最新的部署记录，确认 commit hash 是否与本地一致"
echo ""

# 3. 检查后端部署版本（GitHub Actions）
echo "⚙️ 后端部署版本（GitHub Actions）："
echo "  访问：https://github.com/chrisliuchaofan/ue-asset-library/actions"
echo "  查看最新的 'Deploy Backend to ECS' 工作流"
echo "  确认 commit hash 是否与本地一致"
echo ""

# 4. 检查后端服务状态
echo "🏥 后端服务健康检查："
BACKEND_URL="${BACKEND_API_URL:-https://api.factory-buy.com}"
HEALTH_RESPONSE=$(curl -s "$BACKEND_URL/health" 2>/dev/null)
if [ $? -eq 0 ]; then
  echo "  ✅ 后端服务可用"
  echo "  响应: $HEALTH_RESPONSE"
else
  echo "  ⚠️ 后端服务不可用或无法访问"
fi
echo ""

# 5. 总结
echo "📊 版本一致性检查总结："
echo "  1. 本地代码版本: $LOCAL_COMMIT"
echo "  2. 前端版本: 请查看 Vercel 部署记录"
echo "  3. 后端版本: 请查看 GitHub Actions 部署记录"
echo ""
echo "💡 提示："
echo "  - 如果前后端 commit hash 相同，说明版本一致"
echo "  - 如果不同，需要等待部署完成或手动触发部署"
echo "  - 部署完成后，建议清除浏览器缓存（Ctrl+F5）"


