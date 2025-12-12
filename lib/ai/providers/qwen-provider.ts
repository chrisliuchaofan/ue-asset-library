import type { AIProvider, AIGenerateTextRequest, AIGenerateImageRequest, AIGenerateTextResponse, AIGenerateImageResponse } from '../types';

export class QwenProvider implements AIProvider {
  name = '千问 (Qwen)';
  type = 'qwen' as const;
  
  private endpoint = process.env.AI_IMAGE_API_ENDPOINT || 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation';
  private apiKey = process.env.AI_IMAGE_API_KEY;
  private defaultModel = process.env.AI_IMAGE_API_MODEL || 'qwen-plus-latest';
  private visionModel = process.env.AI_VISION_MODEL || 'qwen-vl-plus-latest';
  
  async generateText(request: AIGenerateTextRequest): Promise<AIGenerateTextResponse> {
    if (!this.apiKey) {
      throw new Error('千问API密钥未配置');
    }
    
    const model = request.model || this.defaultModel;
    
    // 如果 endpoint 包含 aliyun，假定使用阿里云 DashScope 格式
    // 注意：实际生产环境建议使用官方 SDK，这里为了减少依赖使用 fetch
    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model,
        input: {
          messages: [
            ...(request.systemPrompt ? [{
              role: 'system',
              content: request.systemPrompt,
            }] : []),
            {
              role: 'user',
              content: request.prompt,
            },
          ],
        },
        parameters: {
          max_tokens: request.maxTokens || 2000,
          temperature: request.temperature || 0.7,
          result_format: request.responseFormat === 'json' ? 'message' : 'text',
        },
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`千问API调用失败: ${response.status} ${response.statusText} - ${errorText}`);
    }
    
    const data = await response.json();
    
    // 适配不同的响应格式（DashScope 标准格式）
    const text = data.output?.choices?.[0]?.message?.content || data.output?.text || '';
    
    return {
      text,
      raw: data,
    };
  }
  
  async generateImage(request: AIGenerateImageRequest): Promise<AIGenerateImageResponse> {
    // 即使千问有图像生成模型（Wanx），这里暂不实现，优先使用文本和视觉能力
    // 或者将来接入通义万相 API
    throw new Error('千问 Provider 暂不支持图像生成，请配置专门的生图 Provider');
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

