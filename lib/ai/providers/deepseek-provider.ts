import type { AIProvider, AIGenerateTextRequest, AIGenerateTextResponse } from '../types';

export class DeepSeekProvider implements AIProvider {
  name = 'DeepSeek';
  type = 'deepseek' as const;

  private endpoint = process.env.DEEPSEEK_API_ENDPOINT || 'https://api.deepseek.com/v1/chat/completions';
  private apiKey = process.env.DEEPSEEK_API_KEY;
  private defaultModel = process.env.DEEPSEEK_API_MODEL || 'deepseek-chat';

  async generateText(request: AIGenerateTextRequest): Promise<AIGenerateTextResponse> {
    if (!this.apiKey) {
      throw new Error('DeepSeek API密钥未配置');
    }

    const model = request.model || this.defaultModel;

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

    // DeepSeek 使用 OpenAI 兼容格式
    const requestBody = {
      model,
      messages,
      max_tokens: request.maxTokens || 2000,
      temperature: request.temperature || 0.7,
      stream: false,
    };

    // 添加超时控制（30秒）
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    let response: Response;
    try {
      response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error('DeepSeek API 请求超时（30秒）');
      }
      throw error;
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`DeepSeek API 请求失败: ${response.status} ${errorText}`);
    }

    const data = await response.json();

    // 提取响应文本
    const text = data.choices?.[0]?.message?.content || '';

    if (!text) {
      throw new Error('DeepSeek API 返回空响应');
    }

    return {
      text,
      raw: data,
    };
  }

  // DeepSeek 不支持图像生成
  async generateImage(): Promise<never> {
    throw new Error('DeepSeek 不支持图像生成');
  }
}
