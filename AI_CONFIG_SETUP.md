# AI 图像分析环境变量配置指南

## 🚀 快速配置

### 步骤 1：创建 `.env.local` 文件

在项目根目录（`/Users/chrisl/Documents/恒星UE资产库/web/`）创建 `.env.local` 文件：

```bash
cd /Users/chrisl/Documents/恒星UE资产库/web
touch .env.local
```

### 步骤 2：添加环境变量

将以下内容复制到 `.env.local` 文件中：

```bash
# 阿里云通义 Qwen-VL 配置
AI_IMAGE_API_PROVIDER=aliyun
AI_IMAGE_API_ENDPOINT=https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions
AI_IMAGE_API_KEY=sk-6be904aa581042168c05e94fe7bfafaa
AI_IMAGE_API_MODEL=qwen-vl-plus-latest
AI_IMAGE_API_TIMEOUT=30000
AI_IMAGE_API_STRICT=false
```

### 步骤 3：重启开发服务器

**重要**：修改环境变量后，必须重启开发服务器才能生效！

```bash
# 停止当前服务器（Ctrl + C）
# 然后重新启动
npm run dev
```

## ✅ 验证配置

### 方法 1：查看服务器日志

重启后，点击「AI 读图」按钮，查看终端输出：

**配置成功时**，应该看到：
```
[AI API] 尝试调用 (1/3): { provider: 'aliyun', endpoint: '...', timeout: 30000 }
[AI API] 调用成功: { provider: 'aliyun', tagsCount: 4, descriptionLength: 15 }
[AI API] 请求完成，耗时: 2345ms
```

**配置失败时**，会看到：
```
[AI API] 环境变量未配置，返回 mock 占位结果
```

### 方法 2：检查浏览器控制台

打开浏览器控制台（F12），点击「AI 读图」按钮，查看：

- `[AI 读图] 使用的图片 URL:` - 应该显示完整的 OSS URL
- `[AI 读图] API 返回结果:` - 应该显示真实的分析结果，而不是 mock 结果

## 🔍 常见问题

### 问题 1：配置后仍然显示 mock 结果

**原因**：环境变量没有生效

**解决**：
1. 确认 `.env.local` 文件在项目根目录
2. 确认文件内容正确（没有多余的空格或引号）
3. **重启开发服务器**（最重要！）
4. 检查终端是否有错误信息

### 问题 2：API Key 无效

**原因**：API Key 可能已过期或无效

**解决**：
1. 检查 API Key 是否正确
2. 确认 API Key 有足够的额度
3. 在阿里云控制台验证 API Key 状态

### 问题 3：图片 URL 无法访问

**原因**：OSS 图片可能没有配置 CORS 或权限问题

**解决**：
1. 确认图片 URL 可以在浏览器中直接访问
2. 检查 OSS 的 CORS 配置
3. 确认图片是公开可访问的

## 📝 完整配置示例

`.env.local` 文件完整内容（包含 OSS 和 AI 配置）：

```bash
# OSS 配置
STORAGE_MODE=oss
NEXT_PUBLIC_STORAGE_MODE=oss
NEXT_PUBLIC_CDN_BASE=/
OSS_BUCKET=guangzhougamead
OSS_REGION=oss-cn-guangzhou
OSS_ACCESS_KEY_ID=你的AccessKeyId
OSS_ACCESS_KEY_SECRET=你的AccessKeySecret
NEXT_PUBLIC_OSS_BUCKET=guangzhougamead
NEXT_PUBLIC_OSS_REGION=oss-cn-guangzhou

# AI 图像分析配置（阿里云通义 Qwen-VL）
AI_IMAGE_API_PROVIDER=aliyun
AI_IMAGE_API_ENDPOINT=https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions
AI_IMAGE_API_KEY=sk-6be904aa581042168c05e94fe7bfafaa
AI_IMAGE_API_MODEL=qwen-vl-plus-latest
AI_IMAGE_API_TIMEOUT=30000
AI_IMAGE_API_STRICT=false
```

## 🎯 模型切换

如果需要切换到高级模型，只需修改 `AI_IMAGE_API_MODEL`：

```bash
# 标准版（速度快）
AI_IMAGE_API_MODEL=qwen-vl-plus-latest

# 高级版（分析更深入）
AI_IMAGE_API_MODEL=qwen-vl-max-latest
```

修改后同样需要重启开发服务器。

