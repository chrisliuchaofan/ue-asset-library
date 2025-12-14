import { Injectable } from '@nestjs/common';

export type ModelProvider = 'ollama' | 'siliconflow' | 'qwen';

export interface GenerateContentOptions {
  /** 模型名称（可选，provider 会使用默认值） */
  model?: string;
  /** 系统提示词（可选） */
  systemPrompt?: string;
  /** 最大 token 数（可选） */
  maxTokens?: number;
  /** 温度参数（可选，0-2） */
  temperature?: number;
  /** 其他自定义选项 */
  [key: string]: any;
}

export interface GenerateContentResponse {
  /** 生成的文本内容 */
  text: string;
  /** 原始 API 响应（可选） */
  raw?: any;
}

/**
 * ModelAdapter Service
 * 统一所有 AI 模型调用的入口
 * 
 * 使用方式：
 * const result = await modelAdapterService.generateContent('你好', {
 *   provider: 'qwen',
 *   model: 'qwen-turbo',
 * });
 */
@Injectable()
export class ModelAdapterService {
  /**
   * 生成内容（统一入口）
   */
  async generateContent(
    input: string,
    options: GenerateContentOptions & { provider?: ModelProvider } = {}
  ): Promise<GenerateContentResponse> {
    const provider = options.provider || (process.env.MODEL_PROVIDER as ModelProvider) || 'qwen';

    switch (provider) {
      case 'qwen':
        return this.generateWithQwen(input, options);
      case 'siliconflow':
        return this.generateWithSiliconFlow(input, options);
      case 'ollama':
        return this.generateWithOllama(input, options);
      default:
        throw new Error(`不支持的 provider: ${provider}`);
    }
  }

  /**
   * Qwen Provider（阿里云 DashScope）
   */
  private async generateWithQwen(
    input: string,
    options: GenerateContentOptions
  ): Promise<GenerateContentResponse> {
    const apiKey = process.env.QWEN_API_KEY || process.env.DASHSCOPE_API_KEY;
    if (!apiKey) {
      throw new Error('Qwen API Key 未配置，请设置 QWEN_API_KEY 或 DASHSCOPE_API_KEY 环境变量');
    }

    const model = options.model || process.env.QWEN_MODEL || 'qwen-turbo';
    const baseUrl = process.env.QWEN_BASE_URL || 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation';

    const messages: Array<{ role: string; content: string }> = [];
    
    if (options.systemPrompt) {
      messages.push({
        role: 'system',
        content: options.systemPrompt,
      });
    }

    messages.push({
      role: 'user',
      content: input,
    });

    const requestBody = {
      model,
      input: {
        messages,
      },
      parameters: {
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens || 2000,
      },
    };

    try {
      const response = await fetch(baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Qwen API 调用失败: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();

      // Qwen 返回格式：{ output: { choices: [{ message: { content: "..." } }] } }
      const text = data.output?.choices?.[0]?.message?.content || '';

      return {
        text,
        raw: data,
      };
    } catch (error) {
      throw new Error(`Qwen 调用失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * SiliconFlow Provider（OpenAI-compatible）
   */
  private async generateWithSiliconFlow(
    input: string,
    options: GenerateContentOptions
  ): Promise<GenerateContentResponse> {
    const apiKey = process.env.SILICONFLOW_API_KEY;
    if (!apiKey) {
      throw new Error('SiliconFlow API Key 未配置，请设置 SILICONFLOW_API_KEY 环境变量');
    }

    const baseUrl = process.env.SILICONFLOW_BASE_URL || 'https://api.siliconflow.cn/v1';
    const model = options.model || process.env.SILICONFLOW_MODEL || 'deepseek-ai/DeepSeek-V2.5';

    const messages: Array<{ role: string; content: string }> = [];

    if (options.systemPrompt) {
      messages.push({
        role: 'system',
        content: options.systemPrompt,
      });
    }

    messages.push({
      role: 'user',
      content: input,
    });

    const requestBody = {
      model,
      messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens || 2000,
    };

    try {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`SiliconFlow API 调用失败: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();

      // OpenAI-compatible 返回格式
      const text = data.choices?.[0]?.message?.content || '';

      return {
        text,
        raw: data,
      };
    } catch (error) {
      throw new Error(`SiliconFlow 调用失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Ollama Provider（本地测试）
   */
  private async generateWithOllama(
    input: string,
    options: GenerateContentOptions
  ): Promise<GenerateContentResponse> {
    const baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    const model = options.model || process.env.OLLAMA_MODEL || 'llama2';

    const requestBody: any = {
      model,
      prompt: input,
      stream: false,
      options: {
        temperature: options.temperature ?? 0.7,
      },
    };

    if (options.maxTokens) {
      requestBody.options.num_predict = options.maxTokens;
    }

    if (options.systemPrompt) {
      requestBody.system = options.systemPrompt;
    }

    try {
      const response = await fetch(`${baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Ollama API 调用失败: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();

      // Ollama 返回格式
      const text = data.response || '';

      return {
        text,
        raw: data,
      };
    } catch (error) {
      throw new Error(`Ollama 调用失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 获取当前使用的 provider（用于调试）
   */
  getCurrentProvider(): ModelProvider {
    return (process.env.MODEL_PROVIDER as ModelProvider) || 'qwen';
  }
}

