# 环境变量配置说明

## 问题：预览图加载失败

如果遇到预览图加载失败的问题（特别是 OSS 模式下的 `/assets/...` 路径），请检查以下配置：

## 必需的环境变量

### OSS 模式（STORAGE_MODE=oss）

在 `.env.local` 文件中，需要配置以下变量：

```env
# 存储模式
STORAGE_MODE=oss
NEXT_PUBLIC_STORAGE_MODE=oss

# OSS 服务端配置（用于上传和管理）
OSS_BUCKET=你的bucket名称
OSS_REGION=oss-cn-hangzhou  # 根据你的实际地域修改
OSS_ACCESS_KEY_ID=你的AccessKeyId
OSS_ACCESS_KEY_SECRET=你的AccessKeySecret
OSS_ENDPOINT=  # 可选

# OSS 客户端配置（用于前端构建完整 URL，不包含敏感信息）
# ⚠️ 重要：必须配置这两个变量，否则客户端无法构建完整的 OSS URL
NEXT_PUBLIC_OSS_BUCKET=你的bucket名称
NEXT_PUBLIC_OSS_REGION=oss-cn-hangzhou  # 根据你的实际地域修改

# CDN 配置（如果使用了 CDN 加速）
NEXT_PUBLIC_CDN_BASE=https://你的CDN域名
# 或者直接使用 OSS 外网域名
# NEXT_PUBLIC_CDN_BASE=https://你的bucket名称.oss-cn-hangzhou.aliyuncs.com
# 如果未配置 CDN，可以设置为 /（客户端会自动使用 OSS 外网域名）
NEXT_PUBLIC_CDN_BASE=/
```

## AI 服务配置（千问/梦工厂）

```env
# AI 服务配置（统一使用千问 API）
# 阿里云百炼/DashScope API Endpoint
AI_IMAGE_API_ENDPOINT=https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation
# 你的阿里云 API Key
AI_IMAGE_API_KEY=your_qwen_api_key
# 默认模型
AI_IMAGE_API_MODEL=qwen-plus-latest
# 提供商标识
AI_IMAGE_API_PROVIDER=aliyun

# 视觉模型配置（用于图像理解）
AI_VISION_MODEL=qwen-vl-plus-latest

# 即梦 API 配置（预留，待接入）
# JIMENG_API_KEY=
# JIMENG_API_ENDPOINT=

# 可灵 API 配置（预留，待接入）
# KLING_API_KEY=
# KLING_API_ENDPOINT=
```

## 为什么需要 NEXT_PUBLIC_OSS_BUCKET 和 NEXT_PUBLIC_OSS_REGION？

在 Next.js 中：
- **服务端变量**（如 `OSS_BUCKET`）：只能在服务端代码中访问，客户端无法访问
- **客户端变量**（以 `NEXT_PUBLIC_` 开头）：可以在客户端和服务端都访问

当图片路径是 `/assets/...` 且 `NEXT_PUBLIC_CDN_BASE=/` 时，客户端需要知道 OSS bucket 和 region 来构建完整的 OSS URL（如 `https://bucket.oss-region.aliyuncs.com/assets/...`）。

## 配置示例

根据你的配置，`.env.local` 应该包含：

```env
STORAGE_MODE=oss
NEXT_PUBLIC_STORAGE_MODE=oss
NEXT_PUBLIC_CDN_BASE=/

# OSS 服务端配置
OSS_BUCKET=guangzhougamead
OSS_REGION=oss-cn-guangzhou
OSS_ACCESS_KEY_ID=你的AccessKeyId
OSS_ACCESS_KEY_SECRET=你的AccessKeySecret

# OSS 客户端配置（必须与服务端配置一致）
NEXT_PUBLIC_OSS_BUCKET=guangzhougamead
NEXT_PUBLIC_OSS_REGION=oss-cn-guangzhou

# AI 服务配置
AI_IMAGE_API_KEY=sk-xxxxxx
```
