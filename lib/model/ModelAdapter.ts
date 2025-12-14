/**
 * 模型适配层（ModelAdapter）
 * 用于在不同大模型之间切换，提供统一的调用接口
 * 
 * 使用方式：
 * import { generateContent } from '@/lib/model/ModelAdapter';
 * const result = await generateContent('你好', { model: 'llama2' });
 * 
 * 模型选择通过环境变量 MODEL_PROVIDER 控制：
 * - MODEL_PROVIDER=ollama 使用本地 Ollama
 * - MODEL_PROVIDER=siliconflow 使用 SiliconFlow 云模型
 */

export type ModelProvider = 'ollama' | 'siliconflow';

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
 * Ollama Provider
 * 用于本地测试，连接到本地 Ollama 服务
 */
class OllamaProvider {
  private baseUrl: string;

  constructor() {
    // 从环境变量读取 Ollama 服务地址，默认 http://localhost:11434
    this.baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
  }

  async generateContent(
    input: string,
    options: GenerateContentOptions = {}
  ): Promise<GenerateContentResponse> {
    const model = options.model || process.env.OLLAMA_MODEL || 'llama2';
    const systemPrompt = options.systemPrompt;
    const temperature = options.temperature ?? 0.7;
    const maxTokens = options.maxTokens;

    // 构建请求体
    const requestBody: any = {
      model,
      prompt: input,
      stream: false, // 非流式返回
      options: {
        temperature,
      },
    };

    // 如果指定了 max_tokens，添加到 options 中
    if (maxTokens) {
      requestBody.options.num_predict = maxTokens;
    }

    // Ollama 支持 system prompt，但格式可能因版本而异
    // 这里使用 messages 格式（如果支持）
    if (systemPrompt) {
      requestBody.system = systemPrompt;
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/generate`, {
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

      // Ollama 返回格式：{ response: "生成的文本", ... }
      const text = data.response || '';

      return {
        text,
        raw: data,
      };
    } catch (error) {
      throw new Error(`Ollama 调用失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

/**
 * SiliconFlow Provider
 * 使用 OpenAI-compatible API 格式
 */
class SiliconFlowProvider {
  private baseUrl: string;
  private apiKey: string;

  constructor() {
    // SiliconFlow 的 API 地址
    this.baseUrl = process.env.SILICONFLOW_BASE_URL || 'https://api.siliconflow.cn/v1';
    this.apiKey = process.env.SILICONFLOW_API_KEY || '';

    if (!this.apiKey) {
      console.warn('[ModelAdapter] SiliconFlow API Key 未配置，请设置 SILICONFLOW_API_KEY 环境变量');
    }
  }

  async generateContent(
    input: string,
    options: GenerateContentOptions = {}
  ): Promise<GenerateContentResponse> {
    if (!this.apiKey) {
      throw new Error('SiliconFlow API Key 未配置，请设置 SILICONFLOW_API_KEY 环境变量');
    }

    const model = options.model || process.env.SILICONFLOW_MODEL || 'deepseek-ai/DeepSeek-V2.5';
    const systemPrompt = options.systemPrompt;
    const temperature = options.temperature ?? 0.7;
    const maxTokens = options.maxTokens || 2000;

    // 构建 OpenAI-compatible 请求体
    const messages: Array<{ role: string; content: string }> = [];

    if (systemPrompt) {
      messages.push({
        role: 'system',
        content: systemPrompt,
      });
    }

    messages.push({
      role: 'user',
      content: input,
    });

    const requestBody = {
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
    };

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`SiliconFlow API 调用失败: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();

      // OpenAI-compatible 返回格式：{ choices: [{ message: { content: "..." } }] }
      const text = data.choices?.[0]?.message?.content || '';

      return {
        text,
        raw: data,
      };
    } catch (error) {
      throw new Error(`SiliconFlow 调用失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

/**
 * ModelAdapter 类
 * 根据环境变量选择不同的 provider
 */
class ModelAdapter {
  private provider: ModelProvider;
  private ollamaProvider: OllamaProvider;
  private siliconFlowProvider: SiliconFlowProvider;

  constructor() {
    // 从环境变量读取 provider 类型，默认使用 ollama（本地测试）
    const envProvider = (process.env.MODEL_PROVIDER || 'ollama').toLowerCase() as ModelProvider;
    
    // 验证 provider 类型
    if (envProvider !== 'ollama' && envProvider !== 'siliconflow') {
      console.warn(
        `[ModelAdapter] 无效的 MODEL_PROVIDER 值: ${envProvider}，使用默认值 ollama`
      );
      this.provider = 'ollama';
    } else {
      this.provider = envProvider;
    }

    // 初始化 providers
    this.ollamaProvider = new OllamaProvider();
    this.siliconFlowProvider = new SiliconFlowProvider();

    if (process.env.NODE_ENV !== 'production') {
      console.log(`[ModelAdapter] 已初始化，使用 provider: ${this.provider}`);
    }
  }

  /**
   * 生成内容
   * @param input 输入文本
   * @param options 选项
   * @returns 生成的内容
   */
  async generateContent(
    input: string,
    options: GenerateContentOptions = {}
  ): Promise<GenerateContentResponse> {
    switch (this.provider) {
      case 'ollama':
        return this.ollamaProvider.generateContent(input, options);
      case 'siliconflow':
        return this.siliconFlowProvider.generateContent(input, options);
      default:
        throw new Error(`不支持的 provider: ${this.provider}`);
    }
  }

  /**
   * 获取当前使用的 provider
   */
  getProvider(): ModelProvider {
    return this.provider;
  }
}

// 创建单例实例
const modelAdapter = new ModelAdapter();

/**
 * 统一的生成内容函数
 * 业务代码应只调用此函数，不要直接使用 ModelAdapter 实例
 * 
 * @param input 输入文本
 * @param options 选项（可选）
 * @returns 生成的内容
 * 
 * @example
 * ```typescript
 * import { generateContent } from '@/lib/model/ModelAdapter';
 * 
 * const result = await generateContent('你好，请介绍一下你自己', {
 *   model: 'llama2',
 *   temperature: 0.8,
 * });
 * console.log(result.text);
 * ```
 */
export async function generateContent(
  input: string,
  options: GenerateContentOptions = {}
): Promise<GenerateContentResponse> {
  return modelAdapter.generateContent(input, options);
}

/**
 * 获取当前使用的 provider（用于调试）
 */
export function getCurrentProvider(): ModelProvider {
  return modelAdapter.getProvider();
}

