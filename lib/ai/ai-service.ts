/**
 * 统一 AI 服务管理器
 * 支持多提供商、自动降级、缓存
 */

import type { AIProvider, AIProviderType, AIGenerateTextRequest, AIGenerateTextResponse, AIGenerateImageRequest, AIGenerateImageResponse, AIGenerateVideoRequest, AIGenerateVideoResponse, AIGenerateVoiceRequest, AIGenerateVoiceResponse } from './types';
import { QwenProvider } from './providers/qwen-provider';
import { JimengProvider } from './providers/jimeng-provider';
import { createLRUCache } from '@/lib/lru-cache';

class AIServiceManager {
  private providers = new Map<AIProviderType, AIProvider>();
  private defaultProvider: AIProviderType = 'qwen';
  
  // 缓存层（性能优化）
  // 注意：文本生成结果缓存需谨慎，避免敏感信息泄露，主要用于公开模板或重复的高频查询
  private textCache = createLRUCache<string, AIGenerateTextResponse>(100);
  
  constructor() {
    this.registerProviders();
  }
  
  private registerProviders() {
    // 注册千问提供商
    this.providers.set('qwen', new QwenProvider());
    
    // 注册即梦提供商（预留）
    this.providers.set('jimeng', new JimengProvider());
    
    // 可灵等其他提供商可在此注册
  }
  
  /**
   * 获取提供商（支持降级）
   */
  private getProvider(type?: AIProviderType): AIProvider {
    const providerType = type || this.defaultProvider;
    const provider = this.providers.get(providerType);
    
    if (!provider) {
      // 降级到默认提供商
      const defaultProvider = this.providers.get(this.defaultProvider);
      if (!defaultProvider) {
        throw new Error(`AI提供商 ${providerType} 不可用，且默认提供商也不可用`);
      }
      return defaultProvider;
    }
    
    return provider;
  }
  
  /**
   * 文本生成（带缓存）
   */
  async generateText(request: AIGenerateTextRequest, providerType?: AIProviderType): Promise<AIGenerateTextResponse> {
    // 生成缓存键
    const cacheKey = `text:${JSON.stringify(request)}:${providerType || 'default'}`;
    const cached = this.textCache.get(cacheKey);
    if (cached) {
      return cached;
    }
    
    const provider = this.getProvider(providerType);
    if (!provider.generateText) {
      throw new Error(`提供商 ${provider.name} 不支持文本生成`);
    }
    
    try {
      const result = await provider.generateText(request);
      this.textCache.set(cacheKey, result);
      return result;
    } catch (error) {
      // 如果失败且不是默认提供商，尝试降级
      if (providerType && providerType !== this.defaultProvider) {
        console.warn(`[AI Service] ${providerType} 失败，降级到 ${this.defaultProvider}`, error);
        return this.generateText(request, this.defaultProvider);
      }
      throw error;
    }
  }
  
  /**
   * 图像生成
   */
  async generateImage(request: AIGenerateImageRequest, providerType?: AIProviderType): Promise<AIGenerateImageResponse> {
    // 图像生成通常不缓存结果（URL 会过期，且生成成本高，通常需要新鲜结果）
    
    const provider = this.getProvider(providerType);
    if (!provider.generateImage) {
      throw new Error(`提供商 ${provider.name} 不支持图像生成`);
    }
    
    return provider.generateImage(request);
  }
  
  /**
   * 视频生成（支持即梦/可灵）
   */
  async generateVideo(request: AIGenerateVideoRequest): Promise<AIGenerateVideoResponse> {
    const providerType = request.provider || 'jimeng'; // 默认即梦
    const provider = this.getProvider(providerType);
    
    if (!provider.generateVideo) {
      throw new Error(`提供商 ${provider.name} 不支持视频生成`);
    }
    
    return provider.generateVideo(request);
  }
  
  /**
   * 语音生成
   */
  async generateVoice(request: AIGenerateVoiceRequest, providerType?: AIProviderType): Promise<AIGenerateVoiceResponse> {
    const provider = this.getProvider(providerType);
    if (!provider.generateVoice) {
      throw new Error(`提供商 ${provider.name} 不支持语音生成`);
    }
    
    return provider.generateVoice(request);
  }
}

// 单例导出
export const aiService = new AIServiceManager();

