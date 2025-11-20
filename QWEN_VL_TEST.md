# 阿里云通义 Qwen-VL 测试指南

## 📋 配置说明

### 环境变量配置

在 `.env.local` 文件中添加以下配置：

```bash
AI_IMAGE_API_PROVIDER=aliyun
AI_IMAGE_API_ENDPOINT=https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions
AI_IMAGE_API_KEY=sk-6be904aa581042168c05e94fe7bfafaa
AI_IMAGE_API_MODEL=qwen-vl-plus-latest  # 或 qwen-vl-max-latest
AI_IMAGE_API_TIMEOUT=30000
AI_IMAGE_API_STRICT=false
```

### 模型切换

- **qwen-vl-plus-latest**：标准版，速度快，适合常规分析
- **qwen-vl-max-latest**：高级版，分析更深入，适合复杂场景

切换模型只需修改 `AI_IMAGE_API_MODEL` 环境变量即可。

## 🧪 curl 测试示例

### 1. 测试本地 API

```bash
curl -X POST http://localhost:3000/api/ai/analyze-image \
  -H "Content-Type: application/json" \
  -d '{
    "imageUrl": "https://example.com/test-image.jpg"
  }'
```

### 2. 直接测试阿里云 DashScope API

```bash
curl -X POST https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk-6be904aa581042168c05e94fe7bfafaa" \
  -d '{
    "model": "qwen-vl-plus-latest",
    "messages": [
      {
        "role": "user",
        "content": [
          {
            "type": "text",
            "text": "你是资深游戏美术分析师，请先判断图片内容，再给出：1）不超过 8 个标签（每个不超过 6 字），2）一句不超过 25 字的中文描述。仅输出 JSON：{tags:[], description:\"\"}。"
          },
          {
            "type": "image_url",
            "image_url": {
              "url": "https://example.com/test-image.jpg"
            }
          }
        ]
      }
    ],
    "max_tokens": 256
  }'
```

### 3. 使用实际图片 URL 测试

```bash
# 替换为实际的图片 URL
IMAGE_URL="https://your-oss-bucket.oss-cn-guangzhou.aliyuncs.com/assets/test.jpg"

curl -X POST http://localhost:3000/api/ai/analyze-image \
  -H "Content-Type: application/json" \
  -d "{
    \"imageUrl\": \"$IMAGE_URL\"
  }"
```

## 📝 预期响应格式

### 成功响应

```json
{
  "tags": ["角色", "战士", "盔甲", "武器"],
  "description": "一名身穿重甲的战士，手持长剑",
  "raw": {
    "id": "chatcmpl-xxx",
    "object": "chat.completion",
    "created": 1234567890,
    "model": "qwen-vl-plus-latest",
    "choices": [
      {
        "index": 0,
        "message": {
          "role": "assistant",
          "content": "{\"tags\":[\"角色\",\"战士\",\"盔甲\",\"武器\"],\"description\":\"一名身穿重甲的战士，手持长剑\"}"
        },
        "finish_reason": "stop"
      }
    ],
    "usage": {
      "prompt_tokens": 100,
      "completion_tokens": 50,
      "total_tokens": 150
    }
  }
}
```

### 错误响应

```json
{
  "tags": [],
  "description": "",
  "raw": {
    "error": "错误信息"
  }
}
```

## 🔍 调试技巧

### 1. 查看日志

在开发环境下，API 会输出详细日志：

```bash
# 启动开发服务器
npm run dev

# 查看控制台输出
[AI API] 尝试调用 (1/3): { provider: 'aliyun', endpoint: '...', timeout: 30000 }
[AI API] 调用成功: { provider: 'aliyun', tagsCount: 4, descriptionLength: 15 }
[AI API] 请求完成，耗时: 2345ms
```

### 2. 检查响应格式

如果返回的 tags 或 description 为空，检查 `raw` 字段中的原始响应：

```json
{
  "raw": {
    "choices": [{
      "message": {
        "content": "实际的返回内容"
      }
    }]
  }
}
```

### 3. 测试不同模型

```bash
# 测试 plus 模型
AI_IMAGE_API_MODEL=qwen-vl-plus-latest

# 测试 max 模型
AI_IMAGE_API_MODEL=qwen-vl-max-latest
```

## ⚠️ 常见问题

### 1. 返回的 JSON 解析失败

**原因**：模型可能返回了 markdown 代码块格式的 JSON

**解决**：代码已自动处理，会移除 markdown 标记并提取 JSON 部分

### 2. 标签数量超过 8 个

**原因**：模型可能不完全遵循提示词限制

**解决**：代码会自动截取前 8 个标签（如果需要）

### 3. 描述超过 25 字

**原因**：模型可能不完全遵循提示词限制

**解决**：可以在前端截取前 25 个字，或调整提示词

### 4. API 调用超时

**原因**：网络问题或模型响应慢

**解决**：
- 增加 `AI_IMAGE_API_TIMEOUT` 的值（默认 30 秒）
- 检查网络连接
- 尝试使用 `qwen-vl-plus-latest`（速度更快）

## 📊 性能参考

- **qwen-vl-plus-latest**：响应时间约 2-5 秒
- **qwen-vl-max-latest**：响应时间约 5-10 秒

## 🔐 安全提示

- ✅ API Key 已配置在环境变量中，不会暴露在代码中
- ✅ 生产环境建议设置 `AI_IMAGE_API_STRICT=true`
- ✅ 定期检查 API Key 的使用情况
- ✅ 如果 API Key 泄露，立即在阿里云控制台重新生成





