# AI 生成 API 使用指南

## 接口地址

`POST /api/generate`

## 请求格式

### Headers

```typescript
Content-Type: application/json
```

### Body

```typescript
{
  prompt: string;        // 提示词（必需，至少 3 个字符）
  userId?: string | null; // 用户ID（可选，如果为 null 则不扣费）
  cost?: number | null;   // 费用（可选，默认 10 积分）
}
```

### 请求示例

```typescript
// 示例 1：带用户ID的请求（会扣费）
const response = await fetch('/api/generate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    prompt: '生成一张美丽的风景图',
    userId: 'user-123',
    cost: 10, // 可选，默认 10
  }),
});

// 示例 2：匿名请求（不扣费）
const response = await fetch('/api/generate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    prompt: '生成一张美丽的风景图',
    userId: null, // 或省略此字段
  }),
});
```

## 响应格式

### 成功响应 (200)

```typescript
{
  success: true;
  generationId: string;  // 生成记录 ID
  url: string;            // 生成结果的 URL
  remaining: number | null; // 剩余积分（如果 userId 为 null 则为 null）
}
```

### 错误响应

#### 400 Bad Request - 参数错误

```typescript
{
  code: 'VALIDATION_ERROR' | 'INVALID_INPUT',
  message: string,
  userMessage: string,
  details?: {
    errors?: any;
  },
  traceId: string,
  timestamp: string
}
```

#### 402 Payment Required - 积分不足

```typescript
{
  code: 'INSUFFICIENT_CREDITS',
  message: string,
  userMessage: string,
  details: {
    balance: number;    // 当前余额
    required: number;   // 所需积分
  },
  traceId: string,
  timestamp: string
}
```

#### 500 Internal Server Error - 生成失败

```typescript
{
  code: 'INTERNAL_ERROR',
  message: string,
  userMessage: string,
  traceId: string,
  timestamp: string
}
```

## 完整调用示例

```typescript
async function generateImage(prompt: string, userId: string | null) {
  try {
    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        userId,
        cost: 10, // 可选
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      // 处理错误
      if (response.status === 402) {
        // 积分不足
        console.error('积分不足:', data.details);
        alert(`积分不足：当前余额 ${data.details.balance}，需要 ${data.details.required}`);
        return null;
      }
      
      // 其他错误
      console.error('生成失败:', data.message);
      alert(`生成失败：${data.userMessage}`);
      return null;
    }

    // 成功
    console.log('生成成功:', {
      generationId: data.generationId,
      url: data.url,
      remaining: data.remaining,
    });

    return {
      generationId: data.generationId,
      url: data.url,
      remaining: data.remaining,
    };
  } catch (error) {
    console.error('请求失败:', error);
    alert('网络错误，请稍后重试');
    return null;
  }
}

// 使用示例
const result = await generateImage('生成一张美丽的风景图', 'user-123');
if (result) {
  console.log('生成的图片 URL:', result.url);
  console.log('剩余积分:', result.remaining);
}
```

## React Hook 示例

```typescript
import { useState } from 'react';

function useGenerate() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = async (prompt: string, userId: string | null, cost?: number) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          userId,
          cost,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 402) {
          setError(`积分不足：当前余额 ${data.details.balance}，需要 ${data.details.required}`);
        } else {
          setError(data.userMessage || '生成失败');
        }
        return null;
      }

      return data;
    } catch (err) {
      setError('网络错误，请稍后重试');
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { generate, loading, error };
}

// 使用示例
function GenerateButton() {
  const { generate, loading, error } = useGenerate();
  const [result, setResult] = useState<{ url: string; remaining: number | null } | null>(null);

  const handleGenerate = async () => {
    const data = await generate('生成一张美丽的风景图', 'user-123');
    if (data) {
      setResult({ url: data.url, remaining: data.remaining });
    }
  };

  return (
    <div>
      <button onClick={handleGenerate} disabled={loading}>
        {loading ? '生成中...' : '生成图片'}
      </button>
      {error && <div style={{ color: 'red' }}>{error}</div>}
      {result && (
        <div>
          <img src={result.url} alt="Generated" />
          {result.remaining !== null && <p>剩余积分: {result.remaining}</p>}
        </div>
      )}
    </div>
  );
}
```

## 注意事项

1. **积分扣费**：
   - 如果 `userId` 为 `null` 或未提供，不会扣费
   - 如果 `userId` 存在，会在生成成功后扣费
   - 如果生成失败，不会扣费（已扣费会回退）

2. **并发安全**：
   - 使用 RPC 函数或条件更新确保原子扣费
   - 防止并发请求导致重复扣费或余额变负

3. **错误处理**：
   - 积分不足时返回 402 状态码
   - 生成失败时返回 500 状态码，不扣费
   - 所有错误都包含 `traceId` 用于追踪

4. **AI 调用**：
   - 当前使用占位图片（`picsum.photos`）
   - 后续需要替换为真实的 AI 调用逻辑




