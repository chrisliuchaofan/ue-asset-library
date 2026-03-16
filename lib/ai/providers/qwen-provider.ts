import type { AIProvider, AIGenerateTextRequest, AIGenerateImageRequest, AIGenerateTextResponse, AIGenerateImageResponse } from '../types';

export class QwenProvider implements AIProvider {
  name = '千问 (Qwen)';
  type = 'qwen' as const;

  // 默认使用 OpenAI 兼容格式的端点（更通用）
  private endpoint = process.env.AI_IMAGE_API_ENDPOINT || 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';
  private apiKey = process.env.AI_IMAGE_API_KEY;
  private defaultModel = process.env.AI_IMAGE_API_MODEL || 'qwen-plus-latest';
  private visionModel = process.env.AI_VISION_MODEL || 'qwen-vl-plus-latest';

  async generateText(request: AIGenerateTextRequest): Promise<AIGenerateTextResponse> {
    if (!this.apiKey) {
      throw new Error('千问API密钥未配置');
    }

    const model = request.model || this.defaultModel;

    // 检测 API 格式：DashScope 还是 OpenAI 兼容
    // 注意：/compatible-mode/ 路径表示 OpenAI 兼容格式，不是 DashScope 格式
    const isDashScope = (this.endpoint.includes('dashscope') || this.endpoint.includes('aliyuncs'))
                        && !this.endpoint.includes('compatible-mode');

    // 构建 messages（优先使用 messages 数组，支持多轮对话）
    let messages: Array<{ role: string; content: string }>;
    if (request.messages && request.messages.length > 0) {
      messages = request.messages.map(m => ({ role: m.role, content: m.content }));
    } else {
      messages = [];
      if (request.systemPrompt) {
        messages.push({ role: 'system', content: request.systemPrompt });
      }
      messages.push({ role: 'user', content: request.prompt });
    }

    // 根据 API 类型构建不同的请求体
    let requestBody: any;

    if (isDashScope) {
      // 阿里云 DashScope 格式
      requestBody = {
        model,
        input: {
          messages,
        },
        parameters: {
          max_tokens: request.maxTokens || 2000,
          temperature: request.temperature || 0.7,
          result_format: request.responseFormat === 'json' ? 'message' : 'text',
        },
      };
    } else {
      // OpenAI 兼容格式（SiliconFlow、其他服务等）
      requestBody = {
        model,
        messages,
        max_tokens: request.maxTokens || 2000,
        temperature: request.temperature || 0.7,
      };

      // OpenAI 兼容格式的 JSON 模式
      if (request.responseFormat === 'json') {
        requestBody.response_format = { type: 'json_object' };
      }
    }

    // 调试日志（开发环境）
    if (process.env.NODE_ENV === 'development') {
      console.log('[QwenProvider] API 调用:', {
        endpoint: this.endpoint,
        isDashScope,
        model,
        messagesCount: messages.length,
      });
    }

    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`千问API调用失败: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();

    // 适配不同的响应格式
    let text = '';
    if (isDashScope) {
      // DashScope 格式：{ output: { choices: [{ message: { content: "..." } }] } }
      text = data.output?.choices?.[0]?.message?.content || data.output?.text || '';
    } else {
      // OpenAI 兼容格式：{ choices: [{ message: { content: "..." } }] }
      text = data.choices?.[0]?.message?.content || data.text || '';
    }

    return {
      text,
      raw: data,
    };
  }

  async generateImage(request: AIGenerateImageRequest): Promise<AIGenerateImageResponse> {
    if (!this.apiKey) {
      throw new Error('千问API密钥未配置');
    }

    // 通义万相（Wanx）API — DashScope 异步任务模式
    const wanxEndpoint = process.env.WANX_API_ENDPOINT ||
                         'https://dashscope.aliyuncs.com/api/v1/services/aigc/image-generation/generation';
    const wanxModel = process.env.WANX_MODEL || 'wanx-v1';

    // 将比例转换为 Wanx size 参数
    const sizeMap: Record<string, string> = {
      '16:9': '1280*720',
      '9:16': '720*1280',
      '4:3': '1024*768',
      '1:1': '1024*1024',
    };
    const size = (request.aspectRatio && sizeMap[request.aspectRatio]) || request.size || '1024*1024';

    try {
      // Step 1: 提交图片生成任务
      const response = await fetch(wanxEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          // 启用异步模式
          'X-DashScope-Async': 'enable',
        },
        body: JSON.stringify({
          model: wanxModel,
          input: {
            prompt: request.prompt,
          },
          parameters: {
            size,
            n: 1,
            ...(request.style && { style: request.style }),
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`通义万相API调用失败: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();

      // Step 2: 判断是同步返回还是异步任务
      // 同步模式：output.results 直接有 url
      const syncUrl = data.output?.results?.[0]?.url;
      if (syncUrl) {
        return { imageUrl: syncUrl, raw: data };
      }

      // 异步模式：返回 task_id，需要轮询
      const taskId = data.output?.task_id;
      if (!taskId) {
        throw new Error('通义万相API未返回 task_id 或图片URL');
      }

      if (process.env.NODE_ENV === 'development') {
        console.log('[QwenProvider] 图片生成任务已提交, task_id:', taskId);
      }

      // Step 3: 轮询等待结果
      const imageUrl = await this.pollImageTask(taskId);
      return { imageUrl, raw: { taskId } };

    } catch (error) {
      console.error('[QwenProvider] 图片生成失败:', error);
      throw error instanceof Error ? error : new Error('千问图片生成失败');
    }
  }

  /**
   * 轮询 DashScope 异步任务状态
   * 每 2 秒查询一次，超时 120 秒
   */
  private async pollImageTask(taskId: string): Promise<string> {
    const taskEndpoint = `https://dashscope.aliyuncs.com/api/v1/tasks/${taskId}`;
    const maxWaitMs = 120_000; // 120 秒超时
    const pollIntervalMs = 2_000; // 2 秒间隔
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitMs) {
      await sleep(pollIntervalMs);

      const res = await fetch(taskEndpoint, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`轮询任务失败: ${res.status} - ${errText}`);
      }

      const data = await res.json();
      const status = data.output?.task_status;

      if (process.env.NODE_ENV === 'development') {
        console.log(`[QwenProvider] 任务 ${taskId} 状态: ${status}`);
      }

      if (status === 'SUCCEEDED') {
        const imageUrl = data.output?.results?.[0]?.url;
        if (!imageUrl) {
          throw new Error('任务成功但未返回图片URL');
        }
        return imageUrl;
      }

      if (status === 'FAILED') {
        const errMsg = data.output?.message || data.output?.code || '未知错误';
        throw new Error(`图片生成任务失败: ${errMsg}`);
      }

      // PENDING / RUNNING → 继续轮询
    }

    throw new Error(`图片生成超时（${maxWaitMs / 1000}秒），task_id: ${taskId}`);
  }

  async healthCheck(): Promise<boolean> {
    try {
      return !!this.apiKey;
    } catch {
      return false;
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
