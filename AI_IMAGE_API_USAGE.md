# AI 图像分析 API 使用说明

## 📋 概述

AI 图像分析 API 提供了图片内容分析功能，可以自动提取图片的标签和描述信息。

**API 端点**: `POST /api/ai/analyze-image`

## 🔧 配置

### 环境变量说明

**默认行为**：如果未配置 `AI_IMAGE_API_ENDPOINT` 和 `AI_IMAGE_API_KEY`，API 会返回 mock 占位结果，方便前端联调和本地测试。

**必需的环境变量**（仅在需要真实 AI 分析时配置）：

```bash
AI_IMAGE_API_ENDPOINT=https://api.example.com/v1/analyze
AI_IMAGE_API_KEY=你的API密钥
```

**可选的环境变量**：

```bash
# 指定 AI 服务商类型（系统会自动检测，也可手动指定）
AI_IMAGE_API_PROVIDER=openai  # openai / aliyun / baidu / generic

# OpenAI 专用：指定模型
AI_IMAGE_API_MODEL=gpt-4-vision-preview

# 请求超时时间（毫秒，默认 30 秒）
AI_IMAGE_API_TIMEOUT=30000

# 严格模式（默认 false）
# false: 未配置环境变量时返回 mock 占位结果（推荐用于开发环境）
# true: 未配置环境变量时抛出错误（推荐用于生产环境）
AI_IMAGE_API_STRICT=false
```

### Mock 占位结果

当未配置环境变量时，API 会返回以下 mock 结果：

```json
{
  "tags": ["测试图片", "占位标签", "AI 未配置"],
  "description": "这是本地开发环境的占位结果，imageUrl=https://example.com/image.jpg。配置 AI_IMAGE_API_ENDPOINT 和 AI_IMAGE_API_KEY 后会返回真实分析结果。",
  "raw": {
    "mock": true,
    "reason": "MISSING_CONFIG"
  }
}
```

这样前端可以在不配置 AI 服务的情况下进行开发和测试。

## 📝 API 使用

### 请求格式

```typescript
POST /api/ai/analyze-image
Content-Type: application/json

{
  "imageUrl": "https://example.com/image.jpg"
}
```

### 响应格式

```typescript
{
  "tags": ["标签1", "标签2", "标签3"],
  "description": "图片的简短描述",
  "raw": { ... }  // 原始 API 响应（可选）
}
```

### 错误响应

```typescript
{
  "message": "错误信息",
  "error": "详细错误信息（仅开发环境）"
}
```

## 🧪 测试示例

### 使用 curl

```bash
curl -X POST http://localhost:3000/api/ai/analyze-image \
  -H "Content-Type: application/json" \
  -d '{
    "imageUrl": "https://example.com/image.jpg"
  }'
```

### 使用 JavaScript/TypeScript

```typescript
async function analyzeImage(imageUrl: string) {
  try {
    const response = await fetch('/api/ai/analyze-image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        imageUrl: imageUrl,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'AI 图像分析失败');
    }

    const result = await response.json();
    console.log('标签:', result.tags);
    console.log('描述:', result.description);
    
    return result;
  } catch (error) {
    console.error('分析失败:', error);
    throw error;
  }
}

// 使用示例
analyzeImage('https://example.com/image.jpg')
  .then(result => {
    console.log('分析结果:', result);
  })
  .catch(error => {
    console.error('错误:', error);
  });
```

### 使用 Node.js 测试脚本

创建 `scripts/test-ai-api.ts`:

```typescript
const API_BASE = process.env.API_BASE || 'http://localhost:3000';

async function testAIImageAPI() {
  const testImageUrl = 'https://example.com/test-image.jpg';
  
  try {
    console.log('测试 AI 图像分析 API...');
    console.log('图片 URL:', testImageUrl);
    
    const response = await fetch(`${API_BASE}/api/ai/analyze-image`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        imageUrl: testImageUrl,
      }),
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ API 调用成功');
      console.log('标签:', result.tags);
      console.log('描述:', result.description);
      return true;
    } else {
      const error = await response.json();
      console.log(`❌ API 调用失败: HTTP ${response.status}`);
      console.log('错误信息:', error.message);
      return false;
    }
  } catch (error) {
    console.log(`❌ API 调用失败: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}

testAIImageAPI();
```

运行测试：

```bash
npx tsx scripts/test-ai-api.ts
```

## 🔍 支持的服务商

### OpenAI Vision API

```bash
AI_IMAGE_API_ENDPOINT=https://api.openai.com/v1/chat/completions
AI_IMAGE_API_KEY=sk-xxx
AI_IMAGE_API_PROVIDER=openai
AI_IMAGE_API_MODEL=gpt-4-vision-preview
```

### 阿里云视觉智能

```bash
AI_IMAGE_API_ENDPOINT=https://vision.cn-shanghai.aliyuncs.com/analyze
AI_IMAGE_API_KEY=xxx
AI_IMAGE_API_PROVIDER=aliyun
```

### 百度 AI

```bash
AI_IMAGE_API_ENDPOINT=https://aip.baidubce.com/rest/2.0/image-classify/v2/advanced_general
AI_IMAGE_API_KEY=xxx
AI_IMAGE_API_PROVIDER=baidu
```

### 通用格式

如果使用其他服务商，系统会自动使用通用格式：

```bash
AI_IMAGE_API_ENDPOINT=https://api.example.com/v1/analyze
AI_IMAGE_API_KEY=xxx
# 不设置 AI_IMAGE_API_PROVIDER，系统会自动检测
```

## ⚙️ 功能特性

### 1. 自动重试

- 网络错误和 5xx 错误会自动重试（最多 2 次）
- 4xx 错误不重试（客户端错误）
- 递增延迟重试（1 秒、2 秒）

### 2. 超时控制

- 默认超时时间：30 秒
- 可通过 `AI_IMAGE_API_TIMEOUT` 环境变量配置
- 超时后自动取消请求

### 3. 多服务商支持

- 自动检测服务商类型
- 支持不同的请求格式和响应解析
- 便于切换或同时支持多个服务商

### 4. 错误处理

- 根据错误类型返回不同的 HTTP 状态码
- 开发环境返回详细错误信息
- 生产环境隐藏敏感信息

## 🐛 故障排查

### 1. 配置错误

**错误**: `AI 图像分析 API 配置不完整`

**解决**: 
- 默认情况下，未配置环境变量会返回 mock 结果，不会报错
- 如果设置了 `AI_IMAGE_API_STRICT=true`，未配置环境变量会抛出此错误
- 检查环境变量 `AI_IMAGE_API_ENDPOINT` 和 `AI_IMAGE_API_KEY` 是否已设置

### 2. 请求超时

**错误**: `请求超时`

**解决**: 
- 检查网络连接
- 增加 `AI_IMAGE_API_TIMEOUT` 的值
- 检查图片 URL 是否可访问

### 3. 认证失败

**错误**: `401 Unauthorized` 或 `403 Forbidden`

**解决**: 
- 检查 `AI_IMAGE_API_KEY` 是否正确
- 确认 API 密钥是否有效
- 检查服务商的认证方式是否正确

### 4. 服务商检测失败

**错误**: 响应格式解析错误

**解决**: 
- 手动设置 `AI_IMAGE_API_PROVIDER` 环境变量
- 检查服务商的响应格式是否符合预期
- 查看 `raw` 字段中的原始响应

## 📊 性能指标

- **正常响应时间**: 2-5 秒（取决于 AI 服务商）
- **超时时间**: 30 秒（可配置）
- **重试次数**: 最多 2 次
- **并发支持**: 支持多个并发请求

## 🔐 安全提示

- ✅ **不要**在客户端代码中暴露 API 密钥
- ✅ **不要**在公开的文档中暴露真实的 API 密钥
- ✅ 在 Vercel 中配置环境变量是安全的
- ✅ 如果 API 密钥泄露，立即在服务商控制台重新生成

## 📚 相关文档

- [环境变量配置](./VERCEL_ENV_VARIABLES.md)
- [API 路由实现](./app/api/ai/analyze-image/route.ts)

