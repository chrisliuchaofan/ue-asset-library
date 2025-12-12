# OSS 配置设置指南

## 🔧 问题诊断

你的 `.env.local` 文件目前只有 NextAuth 配置，**缺少 OSS 配置**，这导致：
- 本地开发服务器使用 `local` 模式（读取 `data/manifest.json`，但该文件是空的）
- 线上 Vercel 使用 `oss` 模式（读取 OSS 的 `manifest.json`）
- **本地和线上看到的数据不一致**

## ✅ 已完成的修复

1. **修复上传路由**：统一使用 `getStorageMode()` 函数，确保本地和线上行为一致
   - `app/api/upload/route.ts` ✅
   - `app/api/upload/batch/route.ts` ✅

## 📝 需要你手动完成的配置

### 步骤 1：编辑 `.env.local` 文件

打开 `.env.local` 文件，在现有配置后添加以下内容：

```env
# ============================================
# OSS 存储配置（统一使用 OSS 模式，本地和线上共享数据）
# ============================================
STORAGE_MODE=oss
NEXT_PUBLIC_STORAGE_MODE=oss
NEXT_PUBLIC_CDN_BASE=/

# OSS 服务端配置（用于上传和管理）
OSS_BUCKET=guangzhougamead
OSS_REGION=oss-cn-guangzhou
OSS_ACCESS_KEY_ID=你的AccessKeyId
OSS_ACCESS_KEY_SECRET=你的AccessKeySecret

# OSS 客户端配置（用于前端构建完整 URL）
NEXT_PUBLIC_OSS_BUCKET=guangzhougamead
NEXT_PUBLIC_OSS_REGION=oss-cn-guangzhou

# AI 图像分析配置（可选，如果已有可以保留）
AI_IMAGE_API_PROVIDER=aliyun
AI_IMAGE_API_ENDPOINT=https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions
AI_IMAGE_API_KEY=sk-6be904aa581042168c05e94fe7bfafaa
AI_IMAGE_API_MODEL=qwen-vl-plus-latest
AI_IMAGE_API_TIMEOUT=30000
AI_IMAGE_API_STRICT=false
```

### 步骤 2：填写真实的 OSS AccessKey

**重要**：将以下两行替换为你的真实 AccessKey：
- `OSS_ACCESS_KEY_ID=你的AccessKeyId` → 替换为真实的 AccessKey ID
- `OSS_ACCESS_KEY_SECRET=你的AccessKeySecret` → 替换为真实的 AccessKey Secret

**如何获取 AccessKey**：
1. 登录 [阿里云控制台](https://ram.console.aliyun.com/manage/ak)
2. 创建或查看 AccessKey
3. 复制 AccessKey ID 和 AccessKey Secret

### 步骤 3：重启开发服务器

配置完成后，**必须重启开发服务器**才能生效：

```bash
# 停止当前服务器（Ctrl + C）
# 然后重新启动
npm run dev
```

## ✅ 配置完成后的效果

配置完成后：
- ✅ 本地开发服务器使用 OSS 模式
- ✅ 线上 Vercel 也使用 OSS 模式
- ✅ **本地和线上看到的数据完全一致**（都从同一个 OSS 读取）
- ✅ 上传文件时，本地和线上都直接上传到 OSS

## 🔍 验证配置

重启服务器后，访问 `http://localhost:3000/admin`，检查：
1. 页面顶部应该显示 "存储模式: oss"
2. 资产列表应该显示 OSS 中的数据（和线上一样）
3. 上传新资产时，应该直接上传到 OSS

## ⚠️ 注意事项

1. **不要将 `.env.local` 提交到 Git**（已在 `.gitignore` 中）
2. **AccessKey 是敏感信息**，不要泄露
3. **本地和线上使用同一个 OSS**，所以数据是共享的
4. 如果 OSS 中已有数据，配置完成后应该能立即看到

## 🆘 如果还是看不到数据

如果配置完成后还是看不到数据，可能的原因：
1. OSS AccessKey 不正确 → 检查 AccessKey 是否正确
2. OSS 中确实没有数据 → 需要先上传一些资产
3. OSS Bucket 名称或 Region 不正确 → 检查配置是否匹配

可以通过以下方式检查 OSS 中是否有数据：
1. 登录 [阿里云 OSS 控制台](https://oss.console.aliyun.com/)
2. 进入 Bucket：`guangzhougamead`
3. 查看是否有 `manifest.json` 文件
4. 查看 `assets/` 目录是否有文件


