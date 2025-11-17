import { NextResponse } from 'next/server';
import { z } from 'zod';

// 请求参数验证 Schema
const AnalyzeImageRequestSchema = z.object({
  imageUrl: z.string().url('图片 URL 格式不正确').optional(),
  imageBase64: z.string().optional(),
  // 预留：未来支持文件上传
  // imageFile: z.instanceof(File).optional(),
}).refine(
  (data) => data.imageUrl || data.imageBase64,
  {
    message: '必须提供 imageUrl 或 imageBase64 之一',
    path: ['imageUrl'],
  }
);

// AI 图像分析响应类型
interface AIAnalyzeResponse {
  tags: string[];
  description: string;
  raw?: any;
}

// AI 服务商类型（用于适配不同的 API 格式）
type AIProvider = 'openai' | 'aliyun' | 'baidu' | 'generic';

/**
 * 检测 AI 服务商类型（根据 endpoint 或环境变量）
 */
function detectAIProvider(): AIProvider {
  const provider = process.env.AI_IMAGE_API_PROVIDER?.toLowerCase();
  const endpoint = process.env.AI_IMAGE_API_ENDPOINT?.toLowerCase() || '';
  
  if (provider === 'openai' || endpoint.includes('openai') || endpoint.includes('api.openai.com')) {
    return 'openai';
  }
  if (provider === 'aliyun' || endpoint.includes('aliyun') || endpoint.includes('alibaba')) {
    return 'aliyun';
  }
  if (provider === 'baidu' || endpoint.includes('baidu')) {
    return 'baidu';
  }
  return 'generic';
}

/**
 * 解析不同 AI 服务商的响应格式
 */
function parseAIResponse(data: any, provider: AIProvider): AIAnalyzeResponse {
  switch (provider) {
    case 'openai':
      // OpenAI Vision API 格式
      // 假设响应格式：{ choices: [{ message: { content: "描述文本" } }] }
      // 或者自定义格式：{ tags: [...], description: "..." }
      const content = data.choices?.[0]?.message?.content || data.description || '';
      const tags = data.tags || extractTagsFromDescription(content) || [];
      return {
        tags,
        description: content || data.description || '',
        raw: data,
      };
    
    case 'aliyun':
      // 阿里云 DashScope OpenAI 兼容模式返回格式
      // 响应格式：{ choices: [{ message: { content: "JSON字符串" } }] }
      try {
        const content = data.choices?.[0]?.message?.content || '';
        if (!content) {
          return {
            tags: [],
            description: '',
            raw: data,
          };
        }
        
        // 尝试解析 JSON（可能包含 markdown 代码块）
        let jsonStr = content.trim();
        // 移除可能的 markdown 代码块标记
        jsonStr = jsonStr.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '');
        jsonStr = jsonStr.trim();
        
        // 尝试解析 JSON
        let parsedContent: { tags?: string[]; description?: string } = {};
        try {
          parsedContent = JSON.parse(jsonStr);
        } catch (parseError) {
          // 如果解析失败，尝试提取 JSON 部分
          const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            parsedContent = JSON.parse(jsonMatch[0]);
          } else {
            // 如果完全无法解析，返回空结果
            console.warn('[AI API] 无法解析阿里云返回的 JSON:', content);
            return {
              tags: [],
              description: content.substring(0, 50), // 至少返回部分内容
              raw: data,
            };
          }
        }
        
        return {
          tags: Array.isArray(parsedContent.tags) ? parsedContent.tags : [],
          description: parsedContent.description || '',
          raw: data,
        };
      } catch (error) {
        console.error('[AI API] 解析阿里云响应失败:', error);
        return {
          tags: [],
          description: '',
          raw: data,
        };
      }
    
    case 'baidu':
      // 百度 AI 格式
      return {
        tags: data.tags || data.keywords || [],
        description: data.description || data.summary || '',
        raw: data,
      };
    
    default:
      // 通用格式：尝试多种可能的字段名
      return {
        tags: data.tags || data.labels || data.keywords || data.categories || [],
        description: data.description || data.caption || data.summary || data.text || '',
        raw: data,
      };
  }
}

/**
 * 从描述文本中提取标签（简单实现，可根据需要优化）
 */
function extractTagsFromDescription(description: string): string[] {
  if (!description) return [];
  // 简单的关键词提取（实际应用中可以使用 NLP 库）
  const commonTags = ['角色', '场景', '武器', '建筑', '车辆', '动物', '植物', '人物', '物品'];
  return commonTags.filter(tag => description.includes(tag));
}

/**
 * 带超时和重试的 fetch 请求
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeout: number = 30000
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('请求超时');
    }
    throw error;
  }
}

/**
 * 调用 AI 图像分析 API（带重试机制）
 * 如果未配置环境变量，返回 mock 占位结果（除非 AI_IMAGE_API_STRICT=true）
 */
async function callAIImageAPI(
  imageUrl: string,
  maxRetries: number = 2,
  retryDelay: number = 1000
): Promise<AIAnalyzeResponse> {
  const apiEndpoint = process.env.AI_IMAGE_API_ENDPOINT;
  const apiKey = process.env.AI_IMAGE_API_KEY;
  const timeout = parseInt(process.env.AI_IMAGE_API_TIMEOUT || '30000', 10);
  const isStrict = process.env.AI_IMAGE_API_STRICT === 'true';

  // 如果未配置环境变量，且不是严格模式，返回 mock 结果
  if (!apiEndpoint || !apiKey) {
    if (isStrict) {
      throw new Error('AI 图像分析 API 配置不完整，请检查环境变量 AI_IMAGE_API_ENDPOINT 和 AI_IMAGE_API_KEY');
    }
    
    // 返回 mock 占位结果
    if (process.env.NODE_ENV !== 'production') {
      console.log('[AI API] 环境变量未配置，返回 mock 占位结果');
    }
    
    return {
      tags: ['测试图片', '占位标签', 'AI 未配置'],
      description: `这是本地开发环境的占位结果，imageUrl=${imageUrl}。配置 AI_IMAGE_API_ENDPOINT 和 AI_IMAGE_API_KEY 后会返回真实分析结果。`,
      raw: { mock: true, reason: 'MISSING_CONFIG' },
    };
  }

  const provider = detectAIProvider();
  
  // 根据不同的 AI 服务商构建请求体
  const buildRequestBody = (): any => {
    switch (provider) {
      case 'openai':
        // OpenAI Vision API 格式
        return {
          model: process.env.AI_IMAGE_API_MODEL || 'gpt-4-vision-preview',
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: '请分析这张图片，提供标签（用逗号分隔）和简短描述。格式：标签：xxx,xxx,xxx\n描述：xxx',
                },
                {
                  type: 'image_url',
                  image_url: { url: imageUrl },
                },
              ],
            },
          ],
          max_tokens: 300,
        };
      
      case 'aliyun':
        // 阿里云 DashScope OpenAI 兼容模式
        const model = process.env.AI_IMAGE_API_MODEL || 'qwen-vl-plus-latest';
        return {
          model: model,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: '你是资深游戏美术分析师，请先判断图片内容，再给出：1）不超过 8 个标签（每个不超过 6 字），2）一句不超过 25 字的中文描述。仅输出 JSON：{tags:[], description:\'\'}。',
                },
                {
                  type: 'image_url',
                  image_url: { url: imageUrl },
                },
              ],
            },
          ],
          max_tokens: 256,
        };
      
      case 'baidu':
        // 百度 AI 格式
        return {
          image: imageUrl,
          // 可以根据需要添加其他参数
        };
      
      default:
        // 通用格式
        return {
          image_url: imageUrl,
        };
    }
  };

  // 根据不同的 AI 服务商构建请求头
  const buildHeaders = (): HeadersInit => {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    switch (provider) {
      case 'openai':
        headers['Authorization'] = `Bearer ${apiKey}`;
        break;
      case 'aliyun':
        // 阿里云可能需要其他认证方式
        headers['Authorization'] = `Bearer ${apiKey}`;
        break;
      case 'baidu':
        headers['Authorization'] = `Bearer ${apiKey}`;
        break;
      default:
        headers['Authorization'] = `Bearer ${apiKey}`;
        // 也可以使用其他认证方式
        // headers['X-API-Key'] = apiKey;
    }

    return headers;
  };

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      const requestBody = buildRequestBody();
      const headers = buildHeaders();

      if (process.env.NODE_ENV !== 'production') {
        console.log(`[AI API] 尝试调用 (${attempt}/${maxRetries + 1}):`, {
          provider,
          endpoint: apiEndpoint,
          timeout,
        });
      }

      const response = await fetchWithTimeout(
        apiEndpoint,
        {
          method: 'POST',
          headers,
          body: JSON.stringify(requestBody),
        },
        timeout
      );

      if (!response.ok) {
        const errorText = await response.text();
        const errorMessage = `AI API 调用失败: ${response.status} ${response.statusText} - ${errorText}`;
        
        // 对于 4xx 错误（客户端错误），不重试
        if (response.status >= 400 && response.status < 500) {
          throw new Error(errorMessage);
        }
        
        // 对于 5xx 错误（服务器错误），可以重试
        if (attempt <= maxRetries) {
          lastError = new Error(errorMessage);
          await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
          continue;
        }
        
        throw new Error(errorMessage);
      }

      const data = await response.json();
      
      // 检查是否有错误信息
      if (data.error) {
        throw new Error(`AI API 返回错误: ${data.error.message || JSON.stringify(data.error)}`);
      }
      
      const result = parseAIResponse(data, provider);

      if (process.env.NODE_ENV !== 'production') {
        console.log('[AI API] 调用成功:', {
          provider,
          tagsCount: result.tags.length,
          descriptionLength: result.description.length,
        });
      }

      return result;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      const errorMessage = lastError.message;

      // 判断是否为可重试的错误
      const isRetryableError =
        errorMessage.includes('超时') ||
        errorMessage.includes('timeout') ||
        errorMessage.includes('网络') ||
        errorMessage.includes('Network') ||
        errorMessage.includes('ECONNRESET') ||
        errorMessage.includes('ENOTFOUND') ||
        errorMessage.includes('ETIMEDOUT') ||
        errorMessage.includes('ECONNREFUSED') ||
        (errorMessage.includes('5') && errorMessage.includes('错误'));

      if (process.env.NODE_ENV !== 'production') {
        console.warn(`[AI API] 调用失败 (尝试 ${attempt}/${maxRetries + 1}):`, {
          error: errorMessage,
          isRetryableError,
        });
      }

      // 如果是可重试的错误且还有重试次数，则重试
      if (isRetryableError && attempt <= maxRetries) {
        await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
        continue;
      }

      // 不可重试的错误或重试次数用尽，返回优雅的错误结果
      // 不抛出异常，让调用方可以处理错误结果
      if (attempt > maxRetries) {
        return {
          tags: [],
          description: '',
          raw: { error: errorMessage },
        };
      }

      // 继续下一次重试
      continue;
    }
  }

  // 如果所有重试都失败，返回优雅的错误结果
  return {
    tags: [],
    description: '',
    raw: { error: lastError?.message || 'AI 图像分析失败：重试次数用尽' },
  };
}

/**
 * POST /api/ai/analyze-image
 * 分析图片内容，返回标签和描述
 * 
 * 请求体：
 * {
 *   "imageUrl": "https://example.com/image.jpg"  // 图片 URL（优先）
 *   // 或
 *   "imageBase64": "data:image/jpeg;base64,..."   // Base64 编码的图片（预留）
 * }
 * 
 * 响应：
 * {
 *   "tags": ["标签1", "标签2"],
 *   "description": "图片描述",
 *   "raw": { ... }  // 原始 API 响应（可选）
 * }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // 验证请求参数
    const parsed = AnalyzeImageRequestSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json(
        {
          message: '参数验证失败',
          errors: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const { imageUrl, imageBase64 } = parsed.data;

    // 优先使用 URL，如果提供了 base64 则先转换为 URL（预留功能）
    let finalImageUrl: string;
    
    if (imageUrl) {
      finalImageUrl = imageUrl;
    } else if (imageBase64) {
      // 预留：base64 转 URL 的逻辑
      // 目前先返回错误，提示使用 URL 方式
      return NextResponse.json(
        {
          message: 'Base64 方式暂未实现，请使用 imageUrl 参数',
        },
        { status: 501 } // 501 Not Implemented
      );
    } else {
      // 理论上不会到这里（zod refine 已经验证）
      return NextResponse.json(
        {
          message: '必须提供 imageUrl 或 imageBase64',
        },
        { status: 400 }
      );
    }

    // 调用 AI API
    // 注意：如果环境变量未配置，callAIImageAPI 会返回 mock 结果，不会抛异常
    // 如果调用失败，callAIImageAPI 会返回 { tags: [], description: '', raw: { error: '...' } }
    const startTime = Date.now();
    const result = await callAIImageAPI(finalImageUrl);
    const duration = Date.now() - startTime;

    if (process.env.NODE_ENV !== 'production') {
      console.log(`[AI API] 请求完成，耗时: ${duration}ms`);
      if (result.raw?.mock) {
        console.log('[AI API] 返回 mock 占位结果（环境变量未配置）');
      }
      if (result.raw?.error) {
        console.warn('[AI API] 返回错误结果:', result.raw.error);
      }
    }

    // 正常返回结果（包括 mock 结果和错误结果）
    // 即使有错误，也返回 200，让前端可以根据 raw.error 判断
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    // 只有真正的异常（网络错误、第三方 API 500 等）才会到这里
    console.error('[AI API] 图像分析失败:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'AI 图像分析失败';
    
    // 根据错误类型返回不同的状态码
    let status = 500;
    if (errorMessage.includes('参数验证')) {
      status = 400;
    } else if (errorMessage.includes('超时') || errorMessage.includes('timeout')) {
      status = 504; // Gateway Timeout
    } else if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
      status = 401;
    } else if (errorMessage.includes('403') || errorMessage.includes('Forbidden')) {
      status = 403;
    } else if (errorMessage.includes('404') || errorMessage.includes('Not Found')) {
      status = 404;
    } else if (errorMessage.includes('配置不完整')) {
      // 只有在严格模式下才会出现配置不完整的错误
      status = 400;
    }

    return NextResponse.json(
      {
        message: errorMessage,
        error: process.env.NODE_ENV === 'development' ? String(error) : undefined,
      },
      { status }
    );
  }
}

