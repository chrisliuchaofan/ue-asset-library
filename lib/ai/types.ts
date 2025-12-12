/**
 * AI 服务统一类型定义
 */

export type AIProviderType = 'qwen' | 'jimeng' | 'kling' | 'custom';

export interface AIGenerateTextRequest {
  prompt: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  responseFormat?: 'text' | 'json';
  systemPrompt?: string;
}

export interface AIGenerateTextResponse {
  text: string;
  raw?: any;
}

export interface AIGenerateImageRequest {
  prompt: string;
  referenceImageUrl?: string; // 从资产库OSS获取的参考图
  aspectRatio?: '16:9' | '1:1' | '4:3';
  size?: '1K' | '2K' | '4K';
  style?: string;
}

export interface AIGenerateImageResponse {
  imageUrl: string; // 返回OSS URL或base64
  imageBase64?: string;
  raw?: any;
}

export interface AIGenerateVideoRequest {
  imageUrl: string; // 从图像生成步骤获取的图像
  prompt: string;
  duration?: number; // 秒
  resolution?: '720p' | '1080p' | '4K';
  provider?: 'jimeng' | 'kling'; // 视频生成提供商
}

export interface AIGenerateVideoResponse {
  videoUrl: string; // 返回OSS URL或blob URL
  operationId?: string; // 异步操作ID（用于轮询状态）
  status?: 'pending' | 'processing' | 'completed' | 'failed';
  raw?: any;
}

export interface AIGenerateVoiceRequest {
  text: string;
  voice?: string; // 语音类型
  speed?: number;
  pitch?: number;
}

export interface AIGenerateVoiceResponse {
  audioUrl: string; // 返回OSS URL或base64
  audioBase64?: string;
  raw?: any;
}

/**
 * AI 提供商接口（插件化设计）
 */
export interface AIProvider {
  name: string;
  type: AIProviderType;
  
  // 文本生成
  generateText?(request: AIGenerateTextRequest): Promise<AIGenerateTextResponse>;
  
  // 图像生成
  generateImage?(request: AIGenerateImageRequest): Promise<AIGenerateImageResponse>;
  
  // 视频生成（可选，某些提供商不支持）
  generateVideo?(request: AIGenerateVideoRequest): Promise<AIGenerateVideoResponse>;
  
  // 语音生成（可选）
  generateVoice?(request: AIGenerateVoiceRequest): Promise<AIGenerateVoiceResponse>;
  
  // 健康检查
  healthCheck?(): Promise<boolean>;
}

