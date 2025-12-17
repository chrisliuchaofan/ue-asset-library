# 🔧 环境变量配置指南

## 快速配置（复制到 `.env.local`）

在项目根目录创建 `.env.local` 文件，复制以下内容：

```env
# ============================================
# 后端 API 配置（推荐，支持 Dry Run 模式）
# ============================================
NEXT_PUBLIC_BACKEND_API_URL=https://api.factory-buy.com
BACKEND_TEST_EMAIL=test@factory-buy.com
BACKEND_TEST_PASSWORD=password123

# ============================================
# 存储配置（从现有配置复制）
# ============================================
STORAGE_MODE=oss
NEXT_PUBLIC_STORAGE_MODE=oss
NEXT_PUBLIC_CDN_BASE=/
OSS_BUCKET=guangzhougamead
OSS_REGION=oss-cn-guangzhou
OSS_ACCESS_KEY_ID=你的AccessKeyId
OSS_ACCESS_KEY_SECRET=你的AccessKeySecret
NEXT_PUBLIC_OSS_BUCKET=guangzhougamead
NEXT_PUBLIC_OSS_REGION=oss-cn-guangzhou

# ============================================
# AI 图像分析配置（可选，Fallback 方案）
# ============================================
AI_IMAGE_API_PROVIDER=aliyun
AI_IMAGE_API_ENDPOINT=https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions
AI_IMAGE_API_KEY=sk-6be904aa581042168c05e94fe7bfafaa
AI_IMAGE_API_MODEL=qwen-vl-plus-latest
AI_IMAGE_API_TIMEOUT=30000
AI_IMAGE_API_STRICT=false
```

## 后端配置（服务器上）

在后端服务器的 `/opt/ue-assets-backend/backend-api/.env` 文件中添加：

```env
# Dry Run 模式（0成本测试）
MODEL_ENABLED=false
BILLING_ENABLED=false

# 用户白名单
USER_WHITELIST=test@factory-buy.com:password123

# 其他配置...
```

然后重启后端服务：
```bash
pm2 restart ue-assets-backend --update-env
```

## 说明

1. **前端配置**：`.env.local` 文件不会被提交到 Git
2. **后端配置**：需要在服务器上手动配置
3. **Dry Run 模式**：配置后可以 0 成本测试







