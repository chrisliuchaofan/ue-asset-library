#!/bin/bash

# 快速设置 .env.local 文件

ENV_FILE=".env.local"

echo "🔧 设置前端环境变量..."

# 检查文件是否已存在
if [ -f "$ENV_FILE" ]; then
  echo "⚠️  .env.local 文件已存在"
  read -p "是否覆盖？(y/N): " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ 已取消"
    exit 1
  fi
fi

# 创建 .env.local 文件
cat > "$ENV_FILE" << 'EOF'
# ============================================
# 后端 API 配置（推荐，支持 Dry Run 模式）
# ============================================
NEXT_PUBLIC_BACKEND_API_URL=https://api.factory-buy.com
BACKEND_TEST_EMAIL=test@factory-buy.com
BACKEND_TEST_PASSWORD=password123

# 公司邮箱注册限制（多个域名用英文逗号分隔）
COMPANY_EMAIL_DOMAINS=tuyoogame.com
NEXT_PUBLIC_COMPANY_EMAIL_DOMAINS=tuyoogame.com
COMPANY_TEAM_NAME=爆款工坊团队
COMPANY_TEAM_SLUG=baokuan-workshop

# ============================================
# 存储配置
# ============================================
STORAGE_MODE=oss
NEXT_PUBLIC_STORAGE_MODE=oss
NEXT_PUBLIC_CDN_BASE=https://sa205-hengxing-ai-repository-oss.oss-cn-beijing.aliyuncs.com
OSS_BUCKET=sa205-hengxing-ai-repository-oss
OSS_REGION=oss-cn-beijing
OSS_ACCESS_KEY_ID=你的AccessKeyId
OSS_ACCESS_KEY_SECRET=你的AccessKeySecret
NEXT_PUBLIC_OSS_BUCKET=sa205-hengxing-ai-repository-oss
NEXT_PUBLIC_OSS_REGION=oss-cn-beijing

# ============================================
# AI 图像分析配置（可选，Fallback 方案）
# ============================================
AI_IMAGE_API_PROVIDER=aliyun
AI_IMAGE_API_ENDPOINT=https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions
AI_IMAGE_API_KEY=sk-6be904aa581042168c05e94fe7bfafaa
AI_IMAGE_API_MODEL=qwen-vl-plus-latest
AI_IMAGE_API_TIMEOUT=30000
AI_IMAGE_API_STRICT=false
EOF

echo "✅ .env.local 文件已创建"
echo ""
echo "📝 请检查并更新以下配置："
echo "   - OSS_ACCESS_KEY_ID"
echo "   - OSS_ACCESS_KEY_SECRET"
echo "   - BACKEND_TEST_EMAIL 和 BACKEND_TEST_PASSWORD（如果与默认值不同）"
echo ""
echo "🚀 配置完成后，重启开发服务器："
echo "   npm run dev"






