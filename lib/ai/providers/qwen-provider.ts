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
    
    // 构建 messages
    const messages: Array<{ role: string; content: string }> = [];
    if (request.systemPrompt) {
      messages.push({
        role: 'system',
        content: request.systemPrompt,
      });
    }
    messages.push({
      role: 'user',
      content: request.prompt,
    });
    
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
    
    // 使用通义万相（Wanx）API 生成图片
    // 通义万相 API 端点
    const wanxEndpoint = process.env.WANX_API_ENDPOINT || 
                         'https://dashscope.aliyuncs.com/api/v1/services/aigc/image-generation/generation';
    const wanxModel = process.env.WANX_MODEL || 'wanx-v1';
    
    try {
      const response = await fetch(wanxEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: wanxModel,
          input: {
            prompt: request.prompt,
          },
          parameters: {
            size: request.size || '1024*1024',
            n: 1, // 生成数量
            ...(request.style && { style: request.style }),
          },
        }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`通义万相API调用失败: ${response.status} ${response.statusText} - ${errorText}`);
      }
      
      const data = await response.json();
      
      // 通义万相返回格式：{ output: { results: [{ url: "..." }] } }
      const imageUrl = data.output?.results?.[0]?.url || '';
      
      if (!imageUrl) {
        throw new Error('通义万相API未返回图片URL');
      }
      
      return {
        imageUrl,
        raw: data,
      };
    } catch (error) {
      console.error('[QwenProvider] 图片生成失败:', error);
      throw error instanceof Error ? error : new Error('千问图片生成失败');
    }
  }
  
  async healthCheck(): Promise<boolean> {
    try {
      // 简单的健康检查：检查 API Key 是否存在
      return !!this.apiKey;
    } catch {
      return false;
    }
  }
}

