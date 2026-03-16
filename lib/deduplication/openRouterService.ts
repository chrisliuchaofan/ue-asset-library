import { AnalysisReport } from './types';
import { devLog, devWarn } from './utils/devLog';

// 检查使用哪个服务（浏览器中密钥不注入前端时，默认 openrouter，走代理）
const getServiceType = (): 'zhipu' | 'openrouter' => {
  const zhipuKey = (process.env as any).ZHIPU_API_KEY;
  const openrouterKey = (process.env as any).OPENROUTER_API_KEY || (process.env as any).GEMINI_API_KEY;
  const inBrowser = typeof window !== 'undefined';
  if (zhipuKey) return 'zhipu';
  if (openrouterKey) return 'openrouter';
  if (inBrowser) return 'openrouter';
  return 'zhipu';
};

// 动态导入智谱AI服务
let zhipuService: any = null;
const getZhipuService = async () => {
  if (!zhipuService) {
    zhipuService = await import('./zhipuService');
  }
  return zhipuService;
};

// 获取 API Key
const getApiKey = () => {
  // 在浏览器环境中，process.env 是通过 Vite 的 define 注入的
  const serviceType = getServiceType();

  if (serviceType === 'zhipu') {
    const apiKey = (process.env as any).ZHIPU_API_KEY;
    if (!apiKey) {
      console.error('❌ 智谱AI API Key 缺失！');
      throw new Error("智谱AI API Key is missing. Please set ZHIPU_API_KEY in .env.local and restart the dev server");
    }
    const maskedKey = apiKey.length > 10 ? apiKey.substring(0, 10) + '...' : '***';
    devLog('✅ 智谱AI API Key 已加载:', maskedKey);
    return apiKey;
  } else {
    const apiKey = (process.env as any).OPENROUTER_API_KEY || (process.env as any).GEMINI_API_KEY;
    if (!apiKey) {
      console.error('❌ API Key 缺失！');
      console.error('当前环境变量状态:', {
        OPENROUTER_API_KEY: (process.env as any).OPENROUTER_API_KEY ? '已设置' : '未设置',
        GEMINI_API_KEY: (process.env as any).GEMINI_API_KEY ? '已设置' : '未设置',
        allEnvKeys: Object.keys(process.env).filter(k => k.includes('API') || k.includes('KEY'))
      });
      throw new Error("OpenRouter API Key is missing. Please set OPENROUTER_API_KEY in .env.local and restart the dev server");
    }
    const maskedKey = apiKey.length > 10 ? apiKey.substring(0, 10) + '...' : '***';
    devLog('✅ OpenRouter API Key 已加载:', maskedKey);
    return apiKey;
  }
};

/** 当 requestUrl 为相对路径 /api/openrouter 或 /api/zhipu 时，由 Vite/后端代理注入密钥，前端不传 Authorization */
const getHeaders = (requestUrl?: string) => {
  const referer = typeof window !== 'undefined' ? window.location.origin : 'https://super-insight.app';
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'HTTP-Referer': referer,
    'X-Title': 'Super Insight',
  };
  const useProxy = typeof requestUrl === 'string' && requestUrl.startsWith('/api/');
  if (!useProxy) {
    headers['Authorization'] = `Bearer ${getApiKey()}`;
  }
  if (headers['Authorization']) {
    devLog('📋 请求头:', { 'Authorization': headers['Authorization'].substring(0, 20) + '...', 'Content-Type': headers['Content-Type'], 'HTTP-Referer': headers['HTTP-Referer'], 'X-Title': headers['X-Title'] });
  } else {
    devLog('📋 请求头(代理模式，不传密钥):', { 'Content-Type': headers['Content-Type'], 'HTTP-Referer': headers['HTTP-Referer'], 'X-Title': headers['X-Title'] });
  }
  return headers;
};

// 错误消息提取（保持与原有逻辑一致）
export const extractErrorMessage = (err: any): string => {
  if (err === null || err === undefined) return "未知错误 (Empty)";

  if (typeof err === 'string') {
    if (err.includes('[object Object]')) return "操作失败 (Unexpected Object Response)";
    return err.trim() || "未知空错误";
  }

  if (typeof err === 'object') {
    const message = err.message || err.msg || err.error_description || err.error?.message || err.error;

    if (message && typeof message === 'string' && !message.includes('[object Object]')) {
      return message;
    }

    if (message && typeof message === 'object') {
      try {
        const str = JSON.stringify(message);
        if (str && str !== '{}') return str;
      } catch (e) {
        // ignore
      }
    }

    if (err.details && typeof err.details === 'string') return err.details;
    if (err.hint && typeof err.hint === 'string') return `${err.message || 'Error'}: ${err.hint}`;
    if (err.statusText && typeof err.statusText === 'string') return err.statusText;

    try {
      const json = JSON.stringify(err);
      if (json && json !== '{}' && json !== '[]') return json;
    } catch {
      // JSON stringify might fail on circular structures
    }
  }

  const final = String(err);
  if (final.includes('[object Object]') || final.includes('[object Error]')) {
    return "系统内部异常 (Opaque System Error)";
  }
  return final;
};

// JSON 提取工具（增强版）
export const extractJson = (text: string): string => {
  if (!text || typeof text !== 'string') {
    throw new Error('输入文本无效');
  }

  // 先尝试直接解析
  const trimmed = text.trim();
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      JSON.parse(trimmed);
      return trimmed;
    } catch {
      // 继续尝试其他方法
    }
  }

  // 移除 Markdown 代码块标记
  let cleaned = text
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  // 尝试匹配 JSON 对象
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    const candidate = jsonMatch[0];
    try {
      JSON.parse(candidate);
      return candidate;
    } catch {
      // 继续尝试
    }
  }

  // 如果还是不行，尝试修复常见的格式问题
  cleaned = cleaned
    .replace(/\\n/g, ' ')
    .replace(/\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // 最后尝试匹配
  const finalMatch = cleaned.match(/\{[\s\S]*\}/);
  if (finalMatch) {
    return finalMatch[0];
  }

  throw new Error('无法从响应中提取有效的 JSON 数据');
};

// 修复被截断的 JSON
const fixTruncatedJson = (jsonText: string): string => {
  let fixed = jsonText.trim();

  // 如果 JSON 被截断（不以 } 结尾），尝试补全
  if (!fixed.endsWith('}')) {
    // 找到最后一个完整的 flowData 数组项
    const flowDataMatch = fixed.match(/"flowData"\s*:\s*\[([\s\S]*)/);
    if (flowDataMatch) {
      const arrayContent = flowDataMatch[1];
      // 找到最后一个完整的对象
      let braceCount = 0;
      let lastCompleteIndex = -1;

      for (let i = 0; i < arrayContent.length; i++) {
        if (arrayContent[i] === '{') braceCount++;
        if (arrayContent[i] === '}') {
          braceCount--;
          if (braceCount === 0) {
            lastCompleteIndex = i;
          }
        }
      }

      if (lastCompleteIndex >= 0) {
        // 截取到最后一个完整的对象，并关闭数组
        const completeArrayContent = arrayContent.substring(0, lastCompleteIndex + 1);
        // 找到 flowData 开始的位置
        const flowDataStart = fixed.indexOf('"flowData"');
        const beforeFlowData = fixed.substring(0, flowDataStart);
        fixed = beforeFlowData + `"flowData": [${completeArrayContent}]`;
      } else {
        // 如果没有找到完整对象，尝试找到最后一个不完整的对象并补全
        const lastBrace = fixed.lastIndexOf('}');
        if (lastBrace > 0) {
          fixed = fixed.substring(0, lastBrace + 1);
        }
      }
    }

    // 移除可能的不完整字段（这些代码应该在 if (!fixed.endsWith('}')) 块内）
    fixed = fixed.replace(/,\s*"[^"]*"\s*:\s*"[^"]*$/, ''); // 移除不完整的字符串字段
    fixed = fixed.replace(/,\s*"[^"]*"\s*:\s*\[[^\]]*$/, ''); // 移除不完整的数组字段

    // 补全缺失的必需字段
    const hasAverageAttention = fixed.includes('"averageAttention"');
    const hasTotalTime = fixed.includes('"totalTime"');
    const hasTimeAbove80 = fixed.includes('"timeAbove80"');
    const hasPercentageAbove80 = fixed.includes('"percentageAbove80"');
    const hasSummary = fixed.includes('"summary"');
    const hasSuggestions = fixed.includes('"suggestions"');
    const hasPeakMoments = fixed.includes('"peakMoments"');
    const hasLowMoments = fixed.includes('"lowMoments"');

    // 确保 flowData 数组已关闭
    if (fixed.includes('"flowData"') && !fixed.match(/"flowData"\s*:\s*\[[^\]]*\]/)) {
      const flowDataEnd = fixed.lastIndexOf(']');
      if (flowDataEnd < 0) {
        fixed = fixed.replace(/"flowData"\s*:\s*\[([\s\S]*)$/, '"flowData": [$1]');
      }
    }

    // 添加缺失的字段
    let additions: string[] = [];
    if (!hasAverageAttention) additions.push('"averageAttention": 0');
    if (!hasTotalTime) additions.push('"totalTime": 0');
    if (!hasTimeAbove80) additions.push('"timeAbove80": 0');
    if (!hasPercentageAbove80) additions.push('"percentageAbove80": 0');
    if (!hasSummary) additions.push('"summary": ""');
    if (!hasSuggestions) additions.push('"suggestions": []');
    if (!hasPeakMoments) additions.push('"peakMoments": []');
    if (!hasLowMoments) additions.push('"lowMoments": []');

    if (additions.length > 0) {
      // 在最后一个 } 之前添加缺失的字段
      const lastBrace = fixed.lastIndexOf('}');
      if (lastBrace > 0) {
        const before = fixed.substring(0, lastBrace);
        const after = fixed.substring(lastBrace);
        fixed = before + (before.trim().endsWith(',') ? ' ' : ', ') + additions.join(', ') + after;
      }
    }

    // 确保以 } 结尾
    if (!fixed.trim().endsWith('}')) {
      fixed = fixed.trim() + '}';
    }
  }

  return fixed;
};

// 从截断的 JSON 中提取部分数据
const extractPartialFlowData = (jsonText: string): import('./types').FlowAnalysisResult | undefined => {
  // 尝试提取 flowData 数组
  const flowDataMatch = jsonText.match(/"flowData"\s*:\s*\[([\s\S]*?)\]/);
  let flowData: any[] = [];

  if (flowDataMatch) {
    try {
      const arrayContent = flowDataMatch[1];
      // 尝试解析每个对象
      const objectMatches = arrayContent.match(/\{[^}]*\}/g);
      if (objectMatches) {
        flowData = objectMatches.map(objStr => {
          try {
            return JSON.parse(objStr);
          } catch {
            // 如果单个对象解析失败，尝试手动提取字段
            const timeMatch = objStr.match(/"time"\s*:\s*(\d+)/);
            const attentionMatch = objStr.match(/"attention"\s*:\s*(\d+)/);
            const emotionMatch = objStr.match(/"emotion"\s*:\s*"([^"]*)"/);
            const eventMatch = objStr.match(/"event"\s*:\s*"([^"]*)"/);

            return {
              time: timeMatch ? parseInt(timeMatch[1]) : 0,
              attention: attentionMatch ? parseInt(attentionMatch[1]) : 0,
              emotion: emotionMatch ? emotionMatch[1] : '平静',
              event: eventMatch ? eventMatch[1] : ''
            };
          }
        }).filter(Boolean);
      }
    } catch (e) {
      console.error('提取 flowData 失败:', e);
    }
  }

  // 如果没有提取到数据，返回默认值
  if (flowData.length === 0) {
    throw new Error('无法从截断的 JSON 中提取任何数据');
  }

  // 计算统计数据
  const totalTime = Math.max(...flowData.map(p => p.time));
  const averageAttention = flowData.reduce((acc: any, p: any) => acc + p.attention, 0) / flowData.length;
  const timeAbove80 = flowData.filter(p => p.attention >= 80).length * 2;
  const percentageAbove80 = (timeAbove80 / totalTime) * 100;

  return {
    flowData,
    averageAttention,
    timeAbove80,
    totalTime,
    percentageAbove80,
    summary: '视频注意力分析完成（部分数据）。',
    suggestions: [],
    peakMoments: [],
    lowMoments: []
  };
};

// 提取视频第一帧（简单版本，用于 fileToBase64）
const extractVideoFirstFrame = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const videoUrl = URL.createObjectURL(file);
    video.src = videoUrl;
    video.muted = true;
    video.playsInline = true;
    video.crossOrigin = 'anonymous';

    video.onloadedmetadata = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(videoUrl);
        reject(new Error('无法创建canvas上下文'));
        return;
      }

      const maxWidth = 600;
      const maxHeight = 400;
      let width = video.videoWidth;
      let height = video.videoHeight;

      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }
      if (height > maxHeight) {
        width = (width * maxHeight) / height;
        height = maxHeight;
      }

      canvas.width = width;
      canvas.height = height;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      video.currentTime = 0;
      video.onseeked = () => {
        ctx.drawImage(video, 0, 0, width, height);
        const frameData = canvas.toDataURL('image/jpeg', 0.7);
        video.remove();
        URL.revokeObjectURL(videoUrl);
        resolve(frameData.split(',')[1]);
      };

      video.onerror = () => {
        URL.revokeObjectURL(videoUrl);
        reject(new Error('视频加载失败'));
      };
    };

    video.onerror = () => {
      URL.revokeObjectURL(videoUrl);
      reject(new Error('视频加载失败'));
    };
  });
};

// 将文件转换为 base64（优化大文件处理）
// 注意：对于视频文件，现在直接编码整个视频文件（Gemini 3 Pro 支持完整视频输入）
const fileToBase64 = async (file: File): Promise<string> => {
  // 视频文件：直接编码整个视频文件（Gemini 3 Pro 支持完整视频输入）
  if (file.type.startsWith('video/')) {
    // 检查文件大小（建议 < 50MB，OpenRouter 可能有限制）
    const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB
    if (file.size > MAX_VIDEO_SIZE) {
      devWarn(`⚠️ 视频文件较大 (${(file.size / 1024 / 1024).toFixed(2)}MB)，建议压缩到 < 50MB`);
      // 仍然尝试发送，但给出警告
    }

    try {
      // 直接编码整个视频文件
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const base64 = (reader.result as string).split(",")[1];
          devLog('✅ 视频文件已编码为 Base64，大小:', base64.length, '字符', `(${(file.size / 1024 / 1024).toFixed(2)}MB)`);
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    } catch (e) {
      console.error('❌ 视频文件编码失败:', e);
      throw new Error('无法处理视频文件：编码失败');
    }
  }

  const FILE_SIZE_THRESHOLD = 5 * 1024 * 1024; // 5MB

  // 对于大图片文件，优先压缩
  if (file.size > FILE_SIZE_THRESHOLD && file.type.startsWith('image/')) {
    try {
      const compressed = await compressImage(file, 0.7, 1920); // 70% 质量，最大宽度 1920px
      devLog('✅ 大图片已压缩，原始大小:', file.size, '压缩后:', compressed.length, '字符');
      return compressed;
    } catch (e) {
      devWarn('⚠️ 图片压缩失败，降级为完整编码:', e);
      // 降级为完整编码
    }
  }

  // 小文件或降级情况：完整编码
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

// 压缩图片（用于大图片文件）
const compressImage = (file: File, quality: number = 0.7, maxWidth: number = 1920): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // 按比例缩放
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          reject(new Error('无法创建canvas上下文'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const compressedBase64 = canvas.toDataURL(`image/${file.type.split('/')[1] || 'jpeg'}`, quality);
        resolve(compressedBase64.split(',')[1]);
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

// 图片生成结果接口
export interface ImageGenerationResult {
  images: string[]; // base64 data URLs
  text?: string; // 可选的文本描述
}

// 请求去重缓存（防止短时间内重复请求）
const requestCache = new Map<string, { promise: Promise<string>; timestamp: number }>();
const REQUEST_CACHE_TTL = 2000; // 2秒内的相同请求会被去重

// 错误去重缓存（避免重复报错）
const errorCache = new Map<string, { count: number; lastReported: number }>();
const ERROR_REPORT_INTERVAL = 5000; // 5秒内相同错误只报告一次
const MAX_ERROR_COUNT = 3; // 最多报告3次相同错误

// 生成请求的唯一标识
const generateRequestKey = (params: {
  model: string;
  messages: any[];
  temperature?: number;
}): string => {
  return JSON.stringify({
    model: params.model,
    messages: params.messages,
    temperature: params.temperature
  });
};

// 安全的 API 调用（带重试机制和请求去重）
export async function safeChatCompletion(params: {
  model: string;
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string | Array<{ type: string; text?: string; image_url?: { url: string } }> }>;
  temperature?: number;
  response_format?: { type: string };
  modalities?: string[]; // 支持图片生成：["image", "text"]
  image_config?: { // Gemini 图片生成配置
    aspect_ratio?: string; // "1:1", "16:9", "4:3" 等
    image_size?: string; // "1K", "2K", "4K"
  };
  /** 指定 provider 路由，如 { order: ['google-vertex'] } 强制走 Vertex AI（支持 base64 视频） */
  provider?: { order?: string[] };
}): Promise<string> {
  const maxRetries = 2; // 减少重试次数：从 3 次降到 2 次
  let lastError: any = null;

  // 请求去重：检查是否有相同的请求正在进行
  const requestKey = generateRequestKey(params);
  const cached = requestCache.get(requestKey);
  if (cached && Date.now() - cached.timestamp < REQUEST_CACHE_TTL) {
    devLog('🔄 检测到重复请求，复用缓存结果');
    return cached.promise;
  }

  // 创建请求函数
  const executeRequest = async (): Promise<string> => {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        // 转换消息格式以适配 OpenRouter API
        const formattedMessages = params.messages.map(msg => {
          if (typeof msg.content === 'string') {
            return { role: msg.role, content: msg.content };
          } else {
            // 处理多模态内容（图片+文本）
            // OpenRouter 需要将多模态内容转换为数组格式
            const contentArray = Array.isArray(msg.content) ? msg.content : [msg.content];

            // 构建内容数组，确保格式正确
            const formattedContent: any[] = [];

            for (const item of contentArray) {
              if (typeof item === 'string') {
                formattedContent.push({ type: 'text', text: item });
              } else if (item && typeof item === 'object') {
                // 处理 image_url 格式
                if (item.type === 'image_url' && item.image_url) {
                  formattedContent.push({
                    type: 'image_url' as string,
                    image_url: {
                      url: item.image_url.url
                    }
                  });
                } else if (item.type === 'text' && item.text) {
                  formattedContent.push({ type: 'text', text: item.text });
                } else {
                  // 保留原始格式
                  formattedContent.push(item);
                }
              }
            }

            return {
              role: msg.role,
              content: formattedContent
            };
          }
        });

        const requestBody: any = {
          model: params.model,
          messages: formattedMessages,
          temperature: params.temperature ?? 0.7,
        };

        // response_format 是 OpenAI 风格参数；部分 OpenRouter 提供方（尤其 Gemini）不支持，可能直接 500
        // 这里做保守策略：仅对 openai/* 模型下发 response_format，其余模型靠提示词强制 JSON
        if (params.response_format) {
          const modelId = params.model || '';
          const supportsResponseFormat = modelId.startsWith('openai/');
          if (supportsResponseFormat) {
            requestBody.response_format = params.response_format;
          } else {
            devWarn('⚠️ 当前模型不支持 response_format，已跳过该参数以避免 500:', modelId);
          }
        }

        // 支持图片生成：添加 modalities 参数
        if (params.modalities) {
          requestBody.modalities = params.modalities;
        }

        // Gemini 图片生成配置
        if (params.image_config) {
          requestBody.image_config = params.image_config;
        }

        // 指定 provider 路由（如 1v1 视频对比需走 google-vertex 以支持 base64 视频）
        if (params.provider?.order?.length) {
          requestBody.provider = { order: params.provider.order };
        }

        // OpenRouter API 端点：在浏览器中一律走同源代理，密钥由后端/Vite 注入，不进前端
        const inBrowser = typeof window !== 'undefined';
        const apiUrl = inBrowser
          ? '/api/openrouter/chat/completions'
          : 'https://openrouter.ai/api/v1/chat/completions';

        if (attempt > 0) {
          devLog(`🔄 重试请求 (第 ${attempt} 次)...`);
        }

        // 验证多模态消息格式（支持图片和视频）
        const hasMultimodalContent = formattedMessages.some(msg =>
          Array.isArray(msg.content) && msg.content.some((item: any) =>
            item.type === 'image_url' || item.image_url || item.type === 'video_url' || item.video_url
          )
        );

        if (hasMultimodalContent) {
          // 验证媒体 URL 格式（支持图片和视频）
          formattedMessages.forEach((msg, idx) => {
            if (Array.isArray(msg.content)) {
              msg.content.forEach((item: any, itemIdx: number) => {
                if (item.type === 'image_url' && item.image_url?.url) {
                  const url = item.image_url.url;
                  if (!url.startsWith('data:image/')) {
                    devWarn(`⚠️ 警告：消息 ${idx} 的内容项 ${itemIdx} 的图片 URL 格式可能不正确:`, url.substring(0, 100));
                  }
                }
                if (item.type === 'video_url' && item.video_url?.url) {
                  const url = item.video_url.url;
                  if (!url.startsWith('data:video/')) {
                    devWarn(`⚠️ 警告：消息 ${idx} 的内容项 ${itemIdx} 的视频 URL 格式可能不正确:`, url.substring(0, 100));
                  }
                }
              });
            }
          });
        }

        // 记录请求详情（用于调试）
        if (hasMultimodalContent) {
          const sampleMessage = formattedMessages.find(msg => Array.isArray(msg.content));
          if (sampleMessage && Array.isArray(sampleMessage.content)) {
            const mediaItem = sampleMessage.content.find((item: any) =>
              item.type === 'image_url' || item.type === 'video_url'
            );
            if (mediaItem) {
              const url = mediaItem.image_url?.url || mediaItem.video_url?.url;
              if (url) {
                const urlLength = url.length;
                const urlPrefix = url.substring(0, 50);
                const urlSuffix = url.substring(Math.max(0, url.length - 50));
                devLog(`📸 多模态请求详情 (${mediaItem.type}):`, {
                  mediaType: mediaItem.type,
                  urlLength: urlLength,
                  urlSizeMB: (urlLength / 1024 / 1024).toFixed(2),
                  urlPrefix: urlPrefix,
                  urlSuffix: urlSuffix,
                  isDataUrl: url.startsWith('data:'),
                  mimeType: url.match(/^data:([^;]+)/)?.[1] || 'unknown'
                });
              }
            }
          }
        }

        devLog('📤 发送 API 请求:', {
          model: params.model,
          messagesCount: formattedMessages.length,
          hasMultimodalContent,
          url: apiUrl,
          attempt: attempt + 1,
          maxRetries,
          requestBodySize: JSON.stringify(requestBody).length
        });

        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: getHeaders(apiUrl),
          body: JSON.stringify(requestBody),
        });

        devLog('📥 API 响应状态:', response.status, response.statusText);

        if (!response.ok) {
          const errorText = await response.text();
          let errorData;
          try {
            errorData = JSON.parse(errorText);
          } catch {
            errorData = { error: { message: errorText || `HTTP ${response.status}` } };
          }

          // 错误去重：避免重复报错
          const errorKey = `${response.status}_${errorData.error?.message || errorText.substring(0, 50)}`;
          const errorInfo = errorCache.get(errorKey);
          const now = Date.now();

          let shouldReport = true;
          if (errorInfo) {
            const timeSinceLastReport = now - errorInfo.lastReported;
            if (timeSinceLastReport < ERROR_REPORT_INTERVAL) {
              shouldReport = false; // 5秒内不重复报告
            } else if (errorInfo.count >= MAX_ERROR_COUNT) {
              shouldReport = false; // 已报告3次，不再报告
            } else {
              errorInfo.count++;
              errorInfo.lastReported = now;
            }
          } else {
            errorCache.set(errorKey, { count: 1, lastReported: now });
          }

          // 清理旧的错误缓存（超过1分钟）
          if (errorCache.size > 50) {
            for (const [key, info] of errorCache.entries()) {
              if (now - info.lastReported > 60000) {
                errorCache.delete(key);
              }
            }
          }

          // 只在需要时输出错误信息
          if (shouldReport) {
            const errorCount = errorInfo?.count || 1;
            const errorPrefix = errorCount > 1 ? `❌ API 请求失败 (第${errorCount}次):` : '❌ API 请求失败:';

            console.error(errorPrefix, {
              status: response.status,
              statusText: response.statusText,
              url: apiUrl,
              attempt: attempt + 1,
              maxRetries,
              errorMessage: errorData.error?.message || errorText.substring(0, 200)
            });

            // 如果是多模态请求失败，只在第一次报告时输出详细信息
            if (hasMultimodalContent && errorCount === 1) {
              const requestBodyStr = JSON.stringify(requestBody);
              const requestBodyPreview = {
                model: requestBody.model,
                messagesCount: requestBody.messages?.length,
                requestBodySize: requestBodyStr.length
              };
              console.error('📋 请求体预览（用于调试）:', requestBodyPreview);
            }
          }

          // 提取更详细的错误信息
          let errorMessage = errorData.error?.message || errorData.message || `HTTP ${response.status}: ${response.statusText}`;

          // 处理 400 错误（通常是永久性的，不重试）
          if (response.status === 400) {
            if (errorData.error?.code) {
              errorMessage = `[${errorData.error.code}] ${errorMessage}`;
            }
            if (errorData.error?.type) {
              errorMessage = `${errorData.error.type}: ${errorMessage}`;
            }
            // 添加更详细的提示信息
            const hasMultimodalContent = params.messages.some(msg =>
              Array.isArray(msg.content) && msg.content.some((item: any) =>
                item.type === 'image_url' || item.image_url
              )
            );

            if (hasMultimodalContent) {
              const currentModel = params.model;
              const isGoogleModel = currentModel.startsWith('google/') || currentModel.toLowerCase().includes('gemini');

              errorMessage += '\n\n可能的原因：\n1. 模型不支持多模态输入（图片/视频）';
              if (!isGoogleModel) {
                errorMessage += `\n   ⚠️ 当前模型 "${currentModel}" 可能不支持多模态输入`;
              }
              errorMessage += '\n2. 图片格式不正确（应使用 data:image/jpeg;base64,... 格式）\n3. 请求格式不符合模型要求\n4. Base64 数据过大或格式错误\n5. OpenRouter API 配置问题或模型临时不可用\n\n建议：\n- 尝试使用支持多模态的 Google Gemini 模型，如：\n  • google/gemini-3-flash-preview（推荐，速度快）\n  • google/gemini-3-pro-preview（高质量）\n  • google/gemini-2.0-flash-exp（实验版）\n- 检查图片大小是否超过模型限制（建议 < 5MB）\n- 确保使用的是有效的图片格式（JPEG/PNG）\n- 如果问题持续，请刷新页面重新加载模型列表';
            }
            // 400 错误不重试，直接抛出
            throw new Error(errorMessage);
          }

          // 处理 500-599 服务器错误（可重试）
          if (response.status >= 500 && response.status < 600) {
            // 对于多模态请求的 500 错误，提供更详细的诊断信息
            if (hasMultimodalContent) {
              const currentModel = params.model || '';
              const isGeminiModel = currentModel.startsWith('google/') || currentModel.toLowerCase().includes('gemini');

              if (isGeminiModel) {
                // Gemini 模型的多模态请求可能因为以下原因失败：
                // 1. Base64 数据过大
                // 2. 图片格式不支持
                // 3. OpenRouter 对 Gemini 的支持问题
                const requestBodyStr = JSON.stringify(requestBody);
                const requestSize = requestBodyStr.length;

                // 只在第一次报告时输出详细诊断
                const errorKey = `gemini_500_${currentModel}`;
                const errorInfo = errorCache.get(errorKey);
                if (!errorInfo || errorInfo.count === 1) {
                  console.error('🔍 Gemini 多模态请求 500 错误诊断:', {
                    model: currentModel,
                    requestSize: `${(requestSize / 1024).toFixed(2)} KB`,
                    requestSizeTooLarge: requestSize > 10 * 1024 * 1024, // 超过 10MB
                    messagesCount: formattedMessages.length,
                    hasImageContent: hasMultimodalContent,
                  });
                }

                if (requestSize > 10 * 1024 * 1024) {
                  errorMessage += '\n\n⚠️ 请求体过大（超过 10MB），可能是图片 Base64 数据太大。建议：\n- 压缩图片后再上传\n- 使用更小的图片尺寸';
                }
              }
            }

            if (attempt < maxRetries - 1) {
              // 优化退避策略：减少延迟时间（500ms, 1000ms）
              const delay = attempt === 0 ? 500 : 1000;
              // 只在第一次重试时输出日志，避免重复报错
              if (attempt === 0) {
                devLog(`⏳ 服务器错误 (${response.status})，等待 ${delay}ms 后重试... (${attempt + 1}/${maxRetries})`);
              }
              await new Promise(resolve => setTimeout(resolve, delay));
              continue; // 继续重试
            } else {
              // 最后一次尝试也失败了
              errorMessage = `服务器错误 (${response.status})，已重试 ${maxRetries} 次仍失败。${errorMessage}`;

              // 添加建议
              if (hasMultimodalContent) {
                const currentModel = params.model || '';
                const isGeminiModel = currentModel.startsWith('google/') || currentModel.toLowerCase().includes('gemini');

                if (isGeminiModel) {
                  errorMessage += '\n\n💡 建议：\n1. 检查图片大小（建议 < 5MB）\n2. 尝试使用其他 Gemini 模型（如 google/gemini-3-flash-preview）\n3. 如果问题持续，可能是 OpenRouter API 临时问题，请稍后重试';
                }
              }

              throw new Error(errorMessage);
            }
          }

          // 处理 429 限流错误（可重试）
          if (response.status === 429) {
            if (attempt < maxRetries - 1) {
              // 优化退避策略：限流错误等待时间（1000ms, 2000ms）
              const delay = attempt === 0 ? 1000 : 2000;
              // 只在第一次重试时输出日志
              if (attempt === 0) {
                devLog(`⏳ 请求限流，等待 ${delay}ms 后重试... (${attempt + 1}/${maxRetries})`);
              }
              await new Promise(resolve => setTimeout(resolve, delay));
              continue;
            } else {
              errorMessage = `请求限流，已重试 ${maxRetries} 次仍失败。请稍后再试。`;
              throw new Error(errorMessage);
            }
          }

          // 处理 503 服务不可用（可重试）
          if (response.status === 503) {
            if (attempt < maxRetries - 1) {
              // 优化退避策略：服务不可用等待时间（750ms, 1500ms）
              const delay = attempt === 0 ? 750 : 1500;
              // 只在第一次重试时输出日志
              if (attempt === 0) {
                devLog(`⏳ 服务暂时不可用，等待 ${delay}ms 后重试... (${attempt + 1}/${maxRetries})`);
              }
              await new Promise(resolve => setTimeout(resolve, delay));
              continue;
            } else {
              errorMessage = `服务暂时不可用，已重试 ${maxRetries} 次仍失败。请稍后再试。`;
              throw new Error(errorMessage);
            }
          }

          // 其他错误直接抛出
          throw new Error(errorMessage);
        }

        const completion = await response.json();
        devLog('✅ API 响应成功:', {
          model: params.model,
          hasChoices: !!completion.choices,
          choicesCount: completion.choices?.length || 0,
          attempt: attempt + 1
        });

        if (!completion || !completion.choices || completion.choices.length === 0) {
          console.error('❌ API 响应格式错误:', completion);
          throw new Error("AI 引擎未返回有效响应。响应数据: " + JSON.stringify(completion).substring(0, 200));
        }

        // 检查是否有图片生成（modalities 包含 "image"）
        const hasImageModality = params.modalities?.includes('image');
        if (hasImageModality && completion.choices[0].message.images) {
          // 图片生成模式：返回图片 URL 数组的 JSON
          const images = completion.choices[0].message.images.map((img: any) => {
            return img.image_url?.url || img.url || '';
          }).filter(Boolean);

          const textContent = completion.choices[0].message.content || '';

          devLog('✅ 图片生成成功:', {
            imageCount: images.length,
            hasText: !!textContent
          });

          // 返回包含图片和文本的 JSON
          return JSON.stringify({
            images: images,
            text: textContent
          });
        }

        const content = completion.choices[0].message.content;
        if (!content) {
          console.error('❌ API 响应内容为空:', completion);
          throw new Error("AI 响应内容为空。");
        }

        devLog('✅ 获取到响应内容，长度:', typeof content === 'string' ? content.length : '非字符串');
        return typeof content === 'string' ? content : JSON.stringify(content);

      } catch (error: any) {
        lastError = error;
        const errorMsg = extractErrorMessage(error);

        // 如果是网络错误或临时错误，且还有重试机会，继续重试
        const isRetryableError =
          errorMsg.includes("429") ||
          errorMsg.includes("503") ||
          errorMsg.includes("500") ||
          errorMsg.includes("502") ||
          errorMsg.includes("504") ||
          errorMsg.includes("quota") ||
          errorMsg.includes("rate limit") ||
          errorMsg.includes("network") ||
          errorMsg.includes("timeout") ||
          errorMsg.includes("ECONNRESET") ||
          errorMsg.includes("ETIMEDOUT");

        if (isRetryableError && attempt < maxRetries - 1) {
          // 优化退避策略：减少延迟时间（500ms, 1000ms）
          const delay = attempt === 0 ? 500 : 1000;
          // 只在第一次重试时输出日志
          if (attempt === 0) {
            devLog(`⏳ 临时错误，等待 ${delay}ms 后重试... (${attempt + 1}/${maxRetries})`);
          }
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }

        // 最后一次尝试失败，抛出错误
        if (attempt === maxRetries - 1) {
          throw error;
        }
      } // 闭合 try 块
    } // 闭合 for 循环

    // 如果所有重试都失败，抛出最后一个错误（这行不应该执行，因为上面的循环会抛出错误）
    throw lastError || new Error('API 调用失败，已重试 ' + maxRetries + ' 次');
  };

  // 创建带缓存的请求 Promise
  const promise = executeRequest().finally(() => {
    // 请求完成后清理缓存
    setTimeout(() => {
      requestCache.delete(requestKey);
    }, REQUEST_CACHE_TTL);
  });

  requestCache.set(requestKey, { promise, timestamp: Date.now() });
  return promise;
}

// 从视频中提取关键帧（用于创意审核优化）
// 优化：减少默认帧数，使用 requestIdleCallback，支持进度回调
export const extractKeyFramesFromVideo = async (
  file: File,
  frameCount: number = 3, // 减少默认帧数从 5 到 3
  signal?: AbortSignal,
  onProgress?: (progress: number) => void // 进度回调
): Promise<string[]> => {
  return new Promise((resolve, reject) => {
    // 如果已取消，立即拒绝
    if (signal?.aborted) {
      reject(new Error('操作已取消'));
      return;
    }

    const video = document.createElement('video');
    const videoUrl = URL.createObjectURL(file);
    video.src = videoUrl;
    video.muted = true;
    video.playsInline = true;
    video.crossOrigin = 'anonymous';

    // 监听取消信号
    const abortHandler = () => {
      video.remove();
      URL.revokeObjectURL(videoUrl);
      reject(new Error('操作已取消'));
    };

    if (signal) {
      signal.addEventListener('abort', abortHandler);
    }

    let loadTimeoutId: ReturnType<typeof setTimeout> | null = null;

    const handleLoadedMetadata = async () => {
      // 清理超时定时器
      if (loadTimeoutId) {
        clearTimeout(loadTimeoutId);
        loadTimeoutId = null;
      }

      // 如果已取消，立即返回
      if (signal?.aborted) {
        video.remove();
        URL.revokeObjectURL(videoUrl);
        if (signal) {
          signal.removeEventListener('abort', abortHandler);
        }
        return;
      }

      try {
        const duration = video.duration;
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const frames: string[] = [];

        if (!ctx) {
          URL.revokeObjectURL(videoUrl);
          reject(new Error('无法创建canvas上下文'));
          return;
        }

        // 计算关键帧时间点（开头、1/4、1/2、3/4、结尾）
        const timePoints: number[] = [];
        if (frameCount === 1) {
          timePoints.push(0);
        } else {
          for (let i = 0; i < frameCount; i++) {
            if (i === 0) {
              timePoints.push(0); // 开头
            } else if (i === frameCount - 1) {
              timePoints.push(Math.max(0, duration - 0.5)); // 结尾（提前0.5秒）
            } else {
              timePoints.push((duration / (frameCount - 1)) * i);
            }
          }
        }

        // 设置canvas尺寸（限制大小以减少token）
        const maxWidth = 600;
        const maxHeight = 400;
        let width = video.videoWidth;
        let height = video.videoHeight;

        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }

        canvas.width = width;
        canvas.height = height;
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // 提取每个关键帧（使用 requestIdleCallback 优化）
        for (let i = 0; i < timePoints.length; i++) {
          // 检查是否已取消
          if (signal?.aborted) {
            video.remove();
            URL.revokeObjectURL(videoUrl);
            if (signal) {
              signal.removeEventListener('abort', abortHandler);
            }
            reject(new Error('操作已取消'));
            return;
          }

          const time = timePoints[i];
          video.currentTime = Math.min(time, duration - 0.1);

          // 使用 requestIdleCallback 在空闲时处理，避免阻塞主线程
          await new Promise<void>((resolveFrame) => {
            const processFrame = () => {
              let timeoutId: ReturnType<typeof setTimeout> | null = null;
              let isResolved = false;

              const onSeeked = () => {
                if (isResolved) return;
                isResolved = true;
                video.removeEventListener('seeked', onSeeked);
                if (timeoutId) {
                  clearTimeout(timeoutId);
                  timeoutId = null;
                }
                ctx.drawImage(video, 0, 0, width, height);
                // 使用较低质量以减少token（0.7而不是0.85）
                const frameData = canvas.toDataURL('image/jpeg', 0.7);
                frames.push(frameData);

                // 更新进度
                if (onProgress) {
                  onProgress(((i + 1) / timePoints.length) * 100);
                }

                resolveFrame();
              };

              video.addEventListener('seeked', onSeeked);
              timeoutId = setTimeout(() => {
                if (isResolved) return;
                isResolved = true;
                video.removeEventListener('seeked', onSeeked);
                resolveFrame();
              }, 2000); // 2秒超时
            };

            // 使用 requestIdleCallback 如果可用，否则立即执行
            if (typeof requestIdleCallback !== 'undefined') {
              requestIdleCallback(processFrame, { timeout: 1000 });
            } else {
              // 降级：使用 setTimeout 延迟执行，给主线程喘息机会
              setTimeout(processFrame, 0);
            }
          });
        }

        video.remove();
        URL.revokeObjectURL(videoUrl);
        if (signal) {
          signal.removeEventListener('abort', abortHandler);
        }
        devLog(`✅ 从视频 ${file.name} 提取了 ${frames.length} 个关键帧`);
        resolve(frames);
      } catch (error) {
        video.remove();
        URL.revokeObjectURL(videoUrl);
        if (signal) {
          signal.removeEventListener('abort', abortHandler);
        }
        reject(error);
      }
    };

    video.onloadedmetadata = handleLoadedMetadata;

    video.onerror = () => {
      URL.revokeObjectURL(videoUrl);
      if (signal) {
        signal.removeEventListener('abort', abortHandler);
      }
      reject(new Error('视频加载失败'));
    };

    // 5秒超时，使用变量保存以便清理
    loadTimeoutId = setTimeout(() => {
      if (video.readyState < 2) {
        URL.revokeObjectURL(videoUrl);
        if (signal) {
          signal.removeEventListener('abort', abortHandler);
        }
        reject(new Error('视频加载超时'));
      }
    }, 5000);
  });
};

// 视频报告增强（提取关键帧）
export const enrichReportWithFrames = async (
  file: File,
  report: AnalysisReport,
  signal?: AbortSignal
): Promise<AnalysisReport> => {
  if (!file || !file.type.startsWith('video/')) return report;

  // 如果已取消，立即返回
  if (signal?.aborted) {
    return report;
  }

  const parseTime = (timeStr: string) => {
    try {
      const parts = timeStr.split(':');
      if (parts.length === 2) return parseInt(parts[0]) * 60 + parseInt(parts[1]);
      if (parts.length === 3) return parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseInt(parts[2]);
    } catch (e) { }
    return 0;
  };

  const video = document.createElement('video');
  const videoUrl = URL.createObjectURL(file);
  video.src = videoUrl;
  video.muted = true;
  video.playsInline = true;
  video.crossOrigin = 'anonymous';

  // 监听取消信号
  const abortHandler = () => {
    video.remove();
    URL.revokeObjectURL(videoUrl);
  };

  if (signal) {
    signal.addEventListener('abort', abortHandler);
  }

  try {
    await new Promise((resolve, reject) => {
      let timeoutId: ReturnType<typeof setTimeout> | null = null;
      let isResolved = false;

      const onLoadedMetadata = () => {
        if (isResolved) return;
        isResolved = true;
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
        resolve(true);
      };

      const onError = () => {
        if (isResolved) return;
        isResolved = true;
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
        reject(new Error("视频元数据读取失败"));
      };

      video.onloadedmetadata = onLoadedMetadata;
      video.onerror = onError;

      timeoutId = setTimeout(() => {
        if (isResolved) return;
        isResolved = true;
        resolve(false);
      }, 5000);
    });
  } catch (e) {
    URL.revokeObjectURL(videoUrl);
    if (signal) {
      signal.removeEventListener('abort', abortHandler);
    }
    return report;
  }

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const newDetailedAnalysis = [...report.detailed_analysis];

  for (let i = 0; i < newDetailedAnalysis.length; i++) {
    const item = newDetailedAnalysis[i];
    const time = parseTime(item.time_stamp);
    if (time > video.duration) continue;

    video.currentTime = time;
    await new Promise(resolve => {
      let timeoutId: ReturnType<typeof setTimeout> | null = null;
      let isResolved = false;

      const onSeeked = () => {
        if (isResolved) return;
        isResolved = true;
        video.removeEventListener('seeked', onSeeked);
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
        resolve(true);
      };

      video.addEventListener('seeked', onSeeked);
      timeoutId = setTimeout(() => {
        if (isResolved) return;
        isResolved = true;
        video.removeEventListener('seeked', onSeeked);
        resolve(true);
      }, 1000);
    });

    if (ctx) {
      // 保持原始宽高比，确保完整显示
      const maxWidth = 800; // 增加分辨率以确保清晰度
      const maxHeight = 600;

      let width = video.videoWidth;
      let height = video.videoHeight;

      // 按比例缩放，确保不超过最大尺寸
      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }
      if (height > maxHeight) {
        width = (width * maxHeight) / height;
        height = maxHeight;
      }

      canvas.width = width;
      canvas.height = height;

      // 使用高质量渲染
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // 绘制完整视频帧，保持原始宽高比
      ctx.drawImage(video, 0, 0, width, height);

      // 提高图片质量（0.85 而不是 0.6）以确保清晰度
      item.thumbnail_base64 = canvas.toDataURL('image/jpeg', 0.85);

      devLog(`✅ 已提取关键帧 ${item.time_stamp}: ${width}x${height}`);
    }
  }

  video.remove();
  URL.revokeObjectURL(videoUrl);
  if (signal) {
    signal.removeEventListener('abort', abortHandler);
  }
  return { ...report, detailed_analysis: newDetailedAnalysis };
};

// 与报告对话
export const chatWithReport = async (
  report: AnalysisReport,
  history: { role: 'user' | 'model', text: string }[],
  message: string
): Promise<string> => {
  // 如果配置了智谱AI，使用智谱AI服务
  const serviceType = getServiceType();
  if (serviceType === 'zhipu') {
    const zhipu = await getZhipuService();
    return zhipu.chatWithReport(report, history, message);
  }

  // 否则使用OpenRouter
  const reportContext = JSON.stringify({
    total_score: report.total_score,
    summary: report.critique_summary,
    verdict: report.aesthetic_verdict,
    issues: report.detailed_analysis.map(item => ({
      time: item.time_stamp,
      issue: item.issue,
      fix: item.fix_suggestion
    }))
  });

  const messages = [
    {
      role: 'system' as const,
      content: `你是一位言辞犀利、追求极致的资深买量素材总监。你正在协助用户解读一份神经网络生成的审核报告。
      
      你的沟通原则：
      1. **绝对客观**：平庸素材必须被痛批，严禁任何形式的安慰或客套话。
      2. **理解评分**：70分代表"平庸"，80分代表"优秀"，90分以上代表"爆款潜质"。如果分数低，请直接指出其致命死穴。
      3. **专业深度**：从视觉语言（构图、色彩、光影）和创意逻辑（黄金3s、情绪钩子、转化埋点）进行全方位解析。
      4. **导演指令**：给出的建议必须具有可执行性，像是直接对剪辑师下达的修改军令。
      
      当前报告上下文：${reportContext}`
    },
    ...history.map(h => ({
      role: h.role === 'model' ? 'assistant' as const : 'user' as const,
      content: h.text
    })),
    {
      role: 'user' as const,
      content: message
    }
  ];

  return await safeChatCompletion({
    model: 'openai/gpt-4o-mini',
    messages,
    temperature: 0.7
  });
};

// 默认系统提示词
export const DEFAULT_SYSTEM_PROMPT = `你是一位世界顶级、极其挑剔且言辞犀利的游戏广告创意总监。你的唯一目标是：通过审核剔除平庸素材，只留下具有爆款潜质的艺术品。

### 评分红线（绝对严苛，禁止给平庸素材高分）：
- **90+ (S级)**: 极度罕见。前3秒具备核爆级吸引力，视觉无瑕疵，逻辑自洽且极具爽感。
- **80-89 (A级)**: 优秀。有亮点但不够极致，节奏偶尔有微小瑕疵。
- **50-79 (B级)**: 平庸平庸。大多数平庸、缺乏亮点的素材必须落在此区间。**如果只是"还行"，绝对不允许超过65分。**
- **50以下 (不及格)**: 垃圾。浪费买量预算，必须原地重做。

### 核心扣分逻辑（必须在详细拆解中体现）：
1. **黄金3秒失效**: 如果前3秒没有立刻触发用户多巴胺，直接扣 30 分起步。
2. **视觉噪音**: UI 杂乱遮挡核心动作、色彩脏、特效廉价感，直接扣 20 分。
3. **反馈感缺失**: 玩家点击或操作后，画面没有夸张且及时的正向反馈（Screen Shake,特效等），直接扣 25 分。
4. **节奏断层**: 镜头转场生硬、无效留白超过 0.2 秒，扣 15 分。

请严格按照以下 JSON 输出，必须使用中文进行犀利分析：
{
  "total_score": number,
  "is_s_tier": boolean,
  "critique_summary": "极度尖锐、一针见血的点评，严禁客套。如果你认为它是垃圾，请直说。",
  "dimensions": { 
    "composition_score": number, 
    "lighting_score": number, 
    "pacing_score": number,
    "creative_score": number,
    "art_score": number
  },
  "detailed_analysis": [
    { "time_stamp": "MM:SS", "issue": "致命问题描述", "creative_dimension": "逻辑层面的平庸之处", "art_dimension": "视觉层面的硬伤", "fix_suggestion": "不容置疑的修改指令" }
  ],
  "aesthetic_verdict": "综合美学评估，必须预测该素材在真实的买量市场中是否会被用户秒关",
  "creative_verdict": "下一版本迭代的具体必杀技建议",
  "hook_strength": "极强/强/中/弱/极差",
  "visual_style": "具体的艺术流派"
}`;

// 爆款策略拆解
export const breakdownContent = async (input: { text?: string; file?: File; url?: string; model?: string; onChunk?: (chunk: string) => void }): Promise<string> => {
  // 如果配置了智谱AI，使用智谱AI服务
  const serviceType = getServiceType();
  if (serviceType === 'zhipu') {
    const zhipu = await getZhipuService();
    return zhipu.breakdownContent(input);
  }

  // 输入验证：检查是否有有效输入
  const hasFile = !!input.file;
  const hasUrl = !!input.url;
  const text = input.text?.trim() || '';
  const hasText = text.length > 0;

  // 如果没有文件、URL，且文本为空，拒绝调用（仅支持本地上传，不支持链接解析）
  if (!hasFile && !hasUrl && !hasText) {
    throw new Error('请提供素材（图片、视频或文本描述）');
  }

  // 纯文本：无文件、无 URL 时的提示词分支
  const isPureText = hasText && !hasFile && !hasUrl;

  // 检测用户是否要求生成图片（画图、绘制、生成图片等关键词）
  const imageGenerationKeywords = ['画', '绘制', '生成图片', '生成图像', '画一张', '画一个', '画一幅', '画图', '出图', '给我画', '帮我画', '画出来', '画一下'];
  const isImageGenerationRequest = hasText && imageGenerationKeywords.some(keyword => text.includes(keyword));

  // 如果用户要求生成图片，且使用的是支持图片生成的模型，则调用图片生成功能
  if (isImageGenerationRequest && isPureText) {
    const selectedModel = input.model || 'google/gemini-3-pro-image-preview';
    // 检查模型是否支持图片生成（Nano Banana Pro 等）
    const supportsImageGen = selectedModel.includes('image') ||
      selectedModel.includes('gemini-3-pro-image') ||
      selectedModel.includes('gemini-2.5-flash-image') ||
      selectedModel.includes('nano-banana');

    if (supportsImageGen) {
      devLog('🎨 检测到图片生成请求，调用图片生成功能');
      try {
        const imageResult = await generateImage({
          prompt: text,
          model: selectedModel
        });

        // 构建包含图片的 Markdown 响应
        let response = '';
        if (imageResult.text) {
          response += imageResult.text + '\n\n';
        }

        // 添加图片（base64 data URL 可以直接在 Markdown 中使用）
        imageResult.images.forEach((imageUrl, index) => {
          response += `\n![生成的图片 ${index + 1}](${imageUrl})\n\n`;
        });

        // 如果有 onChunk 回调，模拟流式输出
        if (input.onChunk) {
          const chunkSize = response.length > 1000 ? 10 : 5;
          for (let i = 0; i < response.length; i += chunkSize) {
            const chunk = response.slice(i, i + chunkSize);
            input.onChunk(chunk);
            const delay = response.length > 2000 ? 15 : response.length > 500 ? 20 : 30;
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }

        return response;
      } catch (error: any) {
        console.error('❌ 图片生成失败:', error);
        // 如果图片生成失败，继续使用文本对话模式
        const errorMsg = extractErrorMessage(error);
        return `抱歉，图片生成失败：${errorMsg}。让我用文字为您描述一下...\n\n`;
      }
    }
  }

  // 视频/图片素材的系统提示词
  const videoImageSystemPrompt = `你是一位世界顶级的游戏广告创意策略专家，专门负责将爆款素材拆解为可复用的 AI 审核标准。

## 你的任务
将用户提供的素材（图片、视频或文本描述）深度分析，提取出能够用于 AI 审核的关键标准和规则。

## 输出要求
你必须输出结构化的 Markdown 格式内容，包含以下部分：

### 1. 素材核心特征
- **视觉风格**：描述素材的视觉特征（色彩、构图、特效风格等）
- **创意逻辑**：分析素材的创意策略（钩子、节奏、情绪设计等）
- **目标受众**：推断素材针对的用户群体

### 2. 爆款要素拆解
- **黄金3秒设计**：前3秒如何抓住注意力
- **情绪触发点**：哪些元素触发了用户情绪
- **转化埋点**：如何引导用户完成转化动作
- **视觉亮点**：哪些视觉元素是核心卖点

### 3. AI 审核标准（核心输出）
将以上分析转化为具体的审核标准，格式如下：

\`\`\`
## 审核标准

### 评分维度
- **构图评分** (0-100): [具体标准]
- **光影评分** (0-100): [具体标准]
- **节奏评分** (0-100): [具体标准]
- **创意评分** (0-100): [具体标准]
- **美术评分** (0-100): [具体标准]

### 扣分规则
1. [具体扣分项1] - 扣XX分
2. [具体扣分项2] - 扣XX分
...

### 必检项
- [ ] [检查项1]
- [ ] [检查项2]
...

### 系统提示词模板
[生成可直接用于 AI 审核的系统提示词]
\`\`\`

## 注意事项
- 分析必须犀利、专业，拒绝客套话
- 标准必须具体、可执行，不能是空泛的描述
- 输出必须是 Markdown 格式，便于后续使用`;

  // 纯文本输入的系统提示词（自然聊天模式）
  const textOnlySystemPrompt = `你是一位拥有15年以上经验的资深视频广告专家，专注于游戏广告创意和素材审核。你以严谨、专业、务实的态度与用户交流。

## 你的身份和风格
- **专业严谨**：基于丰富的实战经验，给出专业且可执行的建议
- **自然对话**：用自然、流畅的语言与用户交流，就像一位经验丰富的导师在指导
- **拒绝模板**：不要使用固定的模板格式，根据用户的具体问题灵活回答
- **深入洞察**：能够从用户的问题中挖掘深层需求，提供有价值的见解

## 对话原则
1. **直接回答**：用户问什么，就回答什么，不要套用固定格式
2. **专业但易懂**：使用专业术语但要解释清楚，让用户理解
3. **结合实际**：结合真实的广告案例和行业经验来回答
4. **鼓励互动**：可以反问、追问，引导用户更深入地思考问题
5. **诚实客观**：如果信息不足，直接说明需要更多信息才能给出准确建议

## 图片生成能力
- **重要**：如果你使用的是支持图片生成的模型（如 Nano Banana Pro / Gemini 3 Pro Image），你可以直接生成图片
- 当用户要求"画图"、"绘制"、"生成图片"时，系统会自动调用图片生成功能
- 如果图片生成失败，请用文字详细描述用户想要的内容

## 重要提醒
- 用户现在只是文字交流，没有提供视频或图片素材
- 如果用户的问题需要看素材才能回答，可以建议用户上传素材
- 但不要因为缺少素材就拒绝回答，可以基于经验给出通用建议或思路
- 用自然语言回复，不要生成结构化的报告格式`;

  // 根据输入类型选择系统提示词
  const systemPrompt = isPureText ? textOnlySystemPrompt : videoImageSystemPrompt;

  const messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string | Array<{ type: string; text?: string; image_url?: { url: string } }> }> = [
    {
      role: 'system',
      content: systemPrompt
    }
  ];

  if (input.file) {
    const isVideo = input.file.type.startsWith('video/');
    const base64Data = await fileToBase64(input.file);
    const mimeType = input.file.type || (isVideo ? 'video/mp4' : 'image/jpeg');
    const dataUrl = `data:${mimeType};base64,${base64Data}`;

    messages.push({
      role: 'user',
      content: [
        {
          type: 'text',
          text: '请深度分析这个素材，按照系统提示词的要求，拆解为结构化的 AI 审核标准。输出必须是 Markdown 格式。'
        },
        ...(isVideo
          ? [{ type: 'video_url', video_url: { url: dataUrl } } as any]
          : [{ type: 'image_url', image_url: { url: dataUrl } } as any])
      ]
    });

    devLog('📎 文件已添加到消息:', {
      fileName: input.file.name,
      fileType: input.file.type,
      isVideo,
      mediaType: isVideo ? 'video_url' : 'image_url',
      fileSize: input.file.size,
      dataUrlLength: dataUrl.length
    });
  } else if (input.url) {
    messages.push({
      role: 'user',
      content: `请分析这个链接的素材：${input.url}\n\n按照系统提示词的要求，拆解为结构化的 AI 审核标准。输出必须是 Markdown 格式。`
    });
  } else if (hasText) {
    messages.push({
      role: 'user',
      content: text
    });
  }

  // 使用传入的模型，或者 "auto" 时根据是否有文件选择模型
  let selectedModel = input.model;

  if (!selectedModel || selectedModel === 'auto') {
    // 自动选择逻辑：
    // - 如果有文件（视频/图片），使用多模态模型（能读懂视频）
    // - 如果只有文本，使用最快的文本对话模型
    const hasFile = !!(input.file || input.url);
    if (hasFile) {
      // 有文件时使用多模态模型
      selectedModel = getFallbackMultimodalModel();
    } else {
      // 纯文本时使用最快的文本对话模型
      selectedModel = 'openai/gpt-4o-mini'; // 速度快、成本低、质量好
    }
  }

  // 爆款拆解是否走太石网关（scope 非 dedup_only 时，Chat 也走网关）
  const useTuyooForBreakdown = (() => {
    const inBrowser = typeof window !== 'undefined';
    const enabled = inBrowser
      ? (process.env as any).TUYOO_GATEWAY_ENABLED === true || (process.env as any).TUYOO_GATEWAY_ENABLED === 'true'
      : !!(process.env as any).LLM_TOKEN;
    if (!enabled) return false;
    const scope = (process.env as any).TUYOO_GATEWAY_SCOPE;
    return scope !== 'dedup_only';
  })();

  if (useTuyooForBreakdown) {
    const hasFile = !!(input.file || input.url);
    selectedModel =
      (process.env as any).TUYOO_LLM_VIDEO_MODEL ||
      (process.env as any).TUYOO_LLM_DEFAULT_MODEL ||
      (hasFile ? 'gemini-3-pro-preview' : 'glm-4.6');
  } else if (input.file || input.url) {
    const supportsMultimodal = await validateMultimodalModel(selectedModel);
    if (!supportsMultimodal) {
      const fallbackModel = getFallbackMultimodalModel();
      devWarn(`⚠️ 模型 ${selectedModel} 可能不支持多模态输入，切换到备用模型: ${fallbackModel}`);
      selectedModel = fallbackModel;
    }
  }

  devLog('🚀 开始爆款拆解:', {
    hasFile: !!input.file,
    hasUrl: !!input.url,
    hasText: !!input.text,
    fileType: input.file?.type,
    model: selectedModel,
    isPureText,
    useTuyoo: useTuyooForBreakdown
  });

  // 使用选定的模型进行爆款拆解
  // 纯文本对话使用稍高的温度，让回复更自然；素材分析使用较低温度，保证准确性
  const temperature = isPureText ? 0.7 : 0.2;

  let resultRaw: string = '';
  if (useTuyooForBreakdown) {
    const { safeChatCompletion: tuyooChat } = await import('./tuyooGatewayService');
    const res = await tuyooChat({ model: selectedModel as string, messages: messages as any, temperature });
    resultRaw = res || '';
  } else {
    const res = await safeChatCompletion({ model: selectedModel as string, messages: messages as any, temperature });
    resultRaw = res || '';
  }
  const result: string = resultRaw;

  devLog('✅ 爆款拆解完成，结果长度:', result?.length || 0);

  // 如果有onChunk回调，模拟流式输出效果
  if (input.onChunk) {
    // 将结果分块，模拟打字效果（每5-10个字符显示一次，根据内容长度调整速度）
    const chunkSize = result.length > 1000 ? 10 : 5;
    for (let i = 0; i < result.length; i += chunkSize) {
      const chunk = result.slice(i, i + chunkSize);
      input.onChunk(chunk);
      // 根据内容长度调整延迟：短内容慢一点，长内容快一点
      const delay = result.length > 2000 ? 15 : result.length > 500 ? 20 : 30;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  return result;
};

// 生成 Embedding（OpenRouter 不直接支持 embedding，使用文本模型生成描述后转换为向量）
// 注意：OpenRouter 不提供 embedding API，这里提供一个兼容层，实际可能需要使用其他服务
export const generateEmbedding = async (text: string, taskType: 'RETRIEVAL_QUERY' | 'RETRIEVAL_DOCUMENT'): Promise<{ values: number[], isFallback: boolean }> => {
  try {
    // OpenRouter 不直接支持 embedding，使用文本模型生成描述
    // 这里返回一个占位符，实际项目中可能需要：
    // 1. 使用其他 embedding 服务（如 OpenAI embeddings API）
    // 2. 或者使用 OpenRouter 支持的 embedding 模型（如果有）
    // 3. 或者使用本地 embedding 模型

    // 临时方案：返回零向量（需要后续集成专门的 embedding 服务）
    devWarn('OpenRouter does not support direct embedding. Using fallback.');
    return { values: new Array(768).fill(0), isFallback: true };
  } catch (error) {
    return { values: new Array(768).fill(0), isFallback: true };
  }
};

// 模型接口定义（基于 OpenRouter Models API）
export interface OpenRouterModel {
  id: string;
  canonical_slug: string;
  name: string;
  created: number;
  description: string;
  context_length: number;
  architecture: {
    input_modalities: string[]; // ["file", "image", "text"]
    output_modalities: string[];
    tokenizer: string;
    instruct_type: string | null;
  };
  pricing: {
    prompt: string;
    completion: string;
    request: string;
    image: string;
    web_search: string;
    internal_reasoning: string;
    input_cache_read: string;
    input_cache_write: string;
  };
  top_provider: {
    context_length: number;
    max_completion_tokens: number;
    is_moderated: boolean;
  };
  supported_parameters: string[];
}

// 模型列表缓存
const modelsCache: { data: OpenRouterModel[]; timestamp: number } | null = null;
const MODELS_CACHE_TTL = 5 * 60 * 1000; // 5分钟缓存

// 从 OpenRouter API 获取模型列表（带缓存）
export const fetchAvailableModels = async (forceRefresh = false): Promise<OpenRouterModel[]> => {
  // 检查缓存
  if (!forceRefresh && typeof window !== 'undefined') {
    const cached = sessionStorage.getItem('super_insight_models_cache');
    if (cached) {
      try {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < MODELS_CACHE_TTL) {
          devLog('✅ 使用缓存的模型列表');
          return data;
        }
      } catch (e) {
        // 缓存解析失败，继续获取新数据
      }
    }
  }

  try {
    const response = await fetch('https://openrouter.ai/api/v1/models', {
      headers: {
        'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : 'https://super-insight.app',
        'X-Title': 'Super Insight'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch models: ${response.status}`);
    }

    const data = await response.json();
    const models = data.data || [];

    // 保存到缓存
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem('super_insight_models_cache', JSON.stringify({
          data: models,
          timestamp: Date.now()
        }));
      } catch (e) {
        // 缓存写入失败，不影响功能
        devWarn('模型列表缓存写入失败:', e);
      }
    }

    return models;
  } catch (error) {
    console.error('❌ 获取模型列表失败:', error);

    // 如果获取失败，尝试使用缓存（即使过期）
    if (typeof window !== 'undefined') {
      const cached = sessionStorage.getItem('super_insight_models_cache');
      if (cached) {
        try {
          const { data } = JSON.parse(cached);
          devLog('⚠️ 使用过期缓存作为降级方案');
          return data;
        } catch (e) {
          // 忽略
        }
      }
    }

    return [];
  }
};

// 验证模型是否支持多模态
const validateMultimodalModel = async (modelId: string): Promise<boolean> => {
  try {
    // 如果是 Google Gemini 模型，通常支持多模态
    if (modelId.startsWith('google/') || modelId.toLowerCase().includes('gemini')) {
      return true;
    }

    // 尝试从模型列表验证
    const models = await fetchAvailableModels();
    const model = models.find(m => m.id === modelId);
    if (model) {
      const inputModalities = model.architecture?.input_modalities || [];
      return inputModalities.includes('image') || inputModalities.includes('file');
    }

    // 如果找不到模型信息，假设 Google 模型支持多模态
    return modelId.startsWith('google/');
  } catch (e) {
    devWarn('验证模型能力失败，假设支持多模态:', e);
    // 默认假设 Google 模型支持多模态
    return modelId.startsWith('google/') || modelId.toLowerCase().includes('gemini');
  }
};

// 获取支持多模态的备用模型
const getFallbackMultimodalModel = (): string => {
  // 按优先级返回支持多模态的模型
  const fallbackModels = [
    'google/gemini-3-flash-preview',
    'google/gemini-3-pro-preview',
    'google/gemini-2.0-flash-exp',
    'google/gemini-2.5-flash',
    'google/gemini-1.5-pro'
  ];

  // 检查 localStorage 中是否有保存的模型
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('super_insight_analysis_model');
    if (saved && (saved.startsWith('google/') || saved.toLowerCase().includes('gemini'))) {
      return saved;
    }
  }

  return fallbackModels[0];
};

// 过滤出支持多模态的Google模型（支持 image 或 file 输入）
export const getMultimodalModels = (models: OpenRouterModel[]): OpenRouterModel[] => {
  return models.filter(model => {
    // 只保留Google模型
    const isGoogle = model.id?.startsWith('google/') || model.name?.toLowerCase().includes('gemini');
    if (!isGoogle) return false;

    // 支持多模态
    const inputModalities = model.architecture?.input_modalities || [];
    return inputModalities.includes('image') || inputModalities.includes('file');
  });
};

// 默认的多模态模型列表（仅Google模型）
export const DEFAULT_MULTIMODAL_MODELS = [
  {
    id: 'google/gemini-3-pro-preview',
    name: 'Gemini 3 Pro Preview',
    provider: 'Google',
    cost: '付费',
    description: '能读懂视频，高质量分析（推荐）'
  },
  {
    id: 'google/gemini-3-flash-preview',
    name: 'Gemini 3 Flash Preview',
    provider: 'Google',
    cost: '付费',
    description: 'Google 最新多模态模型，支持图片和视频分析，速度快'
  },
  {
    id: 'google/gemini-2.0-flash-exp',
    name: 'Gemini 2.0 Flash Exp',
    provider: 'Google',
    cost: '付费',
    description: 'Gemini 2.0 实验版本，速度快'
  }
] as const;

// 兼容性：保留旧的 MULTIMODAL_MODELS 导出
export const MULTIMODAL_MODELS = DEFAULT_MULTIMODAL_MODELS;

// 获取默认模型（从 localStorage 或使用默认模型）
export const getDefaultModel = (): string => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('super_insight_analysis_model');
    if (saved) return saved; // 如果用户手动选择了模型，使用用户选择
  }
  // 默认使用 Gemini 3 Pro Preview（能读懂视频）
  return 'google/gemini-3-pro-preview';
};

// 简化模型名称，使用主流简化名称
export const simplifyModelName = (modelId: string, modelName?: string): string => {
  // 如果提供了 modelName，先尝试简化它
  if (modelName) {
    // 移除 "Google: " 前缀
    let simplified = modelName.replace(/^Google:\s*/i, '').trim();

    // 移除常见的后缀
    simplified = simplified.replace(/\s*-\s*.*$/i, ''); // 移除 "- 描述" 部分
    simplified = simplified.replace(/\s*\(.*?\)/g, ''); // 移除括号内容
    simplified = simplified.replace(/\s*Preview.*$/i, ''); // 移除 Preview 后缀
    simplified = simplified.replace(/\s*GA.*$/i, ''); // 移除 GA 后缀
    simplified = simplified.replace(/\s*\(free\).*$/i, ''); // 移除 (free) 标记

    // 如果简化后还有内容，返回简化后的名称
    if (simplified.length > 0 && simplified.length < modelName.length) {
      return simplified.trim();
    }
  }

  // 如果没有 modelName 或简化失败，根据 modelId 生成简化名称
  const id = modelId.toLowerCase();

  // Gemini 系列
  if (id.includes('gemini-3-pro')) return 'Gemini 3 Pro';
  if (id.includes('gemini-3-flash')) return 'Gemini 3 Flash';
  if (id.includes('gemini-2.5-pro')) return 'Gemini 2.5 Pro';
  if (id.includes('gemini-2.5-flash')) return 'Gemini 2.5 Flash';
  if (id.includes('gemini-2.0-flash')) return 'Gemini 2.0 Flash';
  if (id.includes('gemini-1.5-pro')) return 'Gemini 1.5 Pro';
  if (id.includes('gemini-1.5-flash')) return 'Gemini 1.5 Flash';

  // Gemma 系列
  if (id.includes('gemma-3-27b')) return 'Gemma 3 27B';
  if (id.includes('gemma-3-12b')) return 'Gemma 3 12B';
  if (id.includes('gemma-3-4b')) return 'Gemma 3 4B';

  // OpenAI 系列
  if (id.includes('gpt-4o')) return 'GPT-4o';
  if (id.includes('gpt-4-turbo')) return 'GPT-4 Turbo';
  if (id.includes('gpt-4')) return 'GPT-4';
  if (id.includes('gpt-3.5')) return 'GPT-3.5';

  // Claude 系列
  if (id.includes('claude-3.5-sonnet')) return 'Claude 3.5 Sonnet';
  if (id.includes('claude-3-opus')) return 'Claude 3 Opus';
  if (id.includes('claude-3-sonnet')) return 'Claude 3 Sonnet';

  // 如果都不匹配，返回原始 modelId 的最后部分
  const parts = modelId.split('/');
  return parts[parts.length - 1] || modelId;
};

// 分析视频
export const analyzeVideo = async (file: File, systemPrompt: string, model?: string): Promise<AnalysisReport> => {
  // 如果配置了智谱AI，使用智谱AI服务
  const serviceType = getServiceType();
  if (serviceType === 'zhipu') {
    const zhipu = await getZhipuService();
    return zhipu.analyzeVideo(file, systemPrompt, model);
  }

  // 否则使用OpenRouter
  const base64Data = await fileToBase64(file);
  // 对于视频文件，使用 video_url 和正确的 MIME 类型（Gemini 3 Pro 支持完整视频输入）
  const isVideo = file.type.startsWith('video/');
  const mimeType = file.type || 'video/mp4'; // 保持原始 MIME 类型
  const mediaUrl = `data:${mimeType};base64,${base64Data}`;

  // 使用传入的模型或默认模型
  let selectedModel = model || getDefaultModel();

  // 验证模型是否支持多模态，如果不支持则使用备用模型
  const supportsMultimodal = await validateMultimodalModel(selectedModel);
  if (!supportsMultimodal) {
    const fallbackModel = getFallbackMultimodalModel();
    devWarn(`⚠️ 模型 ${selectedModel} 可能不支持多模态输入，切换到备用模型: ${fallbackModel}`);
    selectedModel = fallbackModel;
  }

  // 增强的系统提示词，强制 JSON 格式输出
  const enhancedSystemPrompt = `${systemPrompt}

## 输出格式要求（严格遵守）
1. **必须且只能输出纯 JSON 格式**，不能包含任何 Markdown 代码块标记（如 \`\`\`json）
2. **不能包含任何解释性文字**，输出内容必须是有效的 JSON 对象
3. **所有字段必须完整**，不能缺失 required 字段
4. **时间戳格式**：必须使用 "MM:SS" 格式（如 "00:03", "01:25"）
5. **数字类型**：total_score 和所有评分必须是数字类型，不能是字符串

## JSON 结构示例
{
  "total_score": 75,
  "is_s_tier": false,
  "critique_summary": "点评内容",
  "dimensions": {
    "composition_score": 80,
    "lighting_score": 70,
    "pacing_score": 75,
    "creative_score": 70,
    "art_score": 75
  },
  "detailed_analysis": [
    {
      "time_stamp": "00:03",
      "issue": "问题描述",
      "creative_dimension": "创意层面分析",
      "art_dimension": "美术层面分析",
      "fix_suggestion": "修改建议"
    }
  ],
  "aesthetic_verdict": "美学评估",
  "creative_verdict": "创意建议",
  "hook_strength": "极强/强/中/弱/极差",
  "visual_style": "艺术流派"
}`;

  // 根据文件类型选择 content type（视频用 video_url，图片用 image_url）
  const mediaContent = isVideo
    ? {
      type: 'video_url' as const,
      video_url: { url: mediaUrl }
    }
    : {
      type: 'image_url' as const,
      image_url: { url: mediaUrl }
    };

  const messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string | Array<{ type: string; text?: string; image_url?: { url: string }; video_url?: { url: string } }> }> = [
    {
      role: 'system',
      content: enhancedSystemPrompt
    },
    {
      role: 'user',
      content: [
        mediaContent,
        {
          type: 'text',
          text: isVideo
            ? '请基于以上严苛审美标准对**完整视频**进行神经网络审核。绝对禁止给平庸素材高分。对于每一个发现的问题，必须给出具体的时间戳。\n\n重要：直接输出纯 JSON 对象，不要包含任何 Markdown 标记、代码块或解释性文字。'
            : '请基于以上严苛审美标准进行神经网络审核。绝对禁止给平庸素材高分。对于每一个发现的问题，必须给出具体的时间戳。\n\n重要：直接输出纯 JSON 对象，不要包含任何 Markdown 标记、代码块或解释性文字。'
        }
      ]
    }
  ];

  devLog('📎 素材分析消息已构建:', {
    model: selectedModel,
    fileType: file.type,
    mimeType: mimeType,
    fileSize: file.size,
    isVideo,
    mediaType: isVideo ? 'video_url' : 'image_url',
    mediaUrlLength: mediaUrl.length,
    mediaUrlSizeMB: (mediaUrl.length / 1024 / 1024).toFixed(2),
    mediaUrlPrefix: mediaUrl.substring(0, 50) + '...',
    messagesCount: messages.length
  });

  devLog('🚀 开始分析素材:', {
    model: selectedModel,
    fileType: file.type,
    fileSize: file.size,
    isVideo,
    mediaType: isVideo ? 'video_url' : 'image_url',
    hasSystemPrompt: !!systemPrompt
  });

  const text = await safeChatCompletion({
    model: selectedModel,
    messages,
    temperature: 0.3,
    response_format: { type: 'json_object' }
  });

  devLog('📝 收到分析结果，长度:', text?.length || 0);

  if (!text) {
    throw new Error("AI 引擎未返回分析文本。");
  }

  try {
    // 先尝试直接解析
    let jsonStr = text.trim();

    // 移除可能的 Markdown 代码块标记
    jsonStr = jsonStr.replace(/^```json\s*/i, '');
    jsonStr = jsonStr.replace(/^```\s*/i, '');
    jsonStr = jsonStr.replace(/\s*```$/i, '');
    jsonStr = jsonStr.trim();

    // 如果还是无法解析，使用 extractJson 工具
    if (!jsonStr.startsWith('{')) {
      jsonStr = extractJson(text);
    }

    const parsed = JSON.parse(jsonStr) as AnalysisReport;

    // 验证必需字段
    if (typeof parsed.total_score !== 'number') {
      throw new Error(`total_score 必须是数字类型，当前为: ${typeof parsed.total_score}`);
    }
    if (!Array.isArray(parsed.detailed_analysis)) {
      throw new Error('detailed_analysis 必须是数组类型');
    }
    if (!parsed.dimensions) {
      throw new Error('缺少 dimensions 字段');
    }

    return parsed;
  } catch (e: any) {
    console.error("JSON Parsing Error:", e);
    console.error("Raw response:", text);
    throw new Error(`报告生成失败：AI 返回的数据格式无法解析。错误信息: ${e.message || '未知错误'}`);
  }
};

// 描述视频意图（用于规则匹配）
export const describeVideoIntent = async (file: File): Promise<string> => {
  const base64Data = await fileToBase64(file);
  // 对于视频文件，使用 video_url 和正确的 MIME 类型（Gemini 3 Pro 支持完整视频输入）
  const isVideo = file.type.startsWith('video/');
  const mimeType = file.type || (isVideo ? 'video/mp4' : 'image/jpeg');
  const mediaUrl = `data:${mimeType};base64,${base64Data}`;

  // 根据文件类型选择 content type（视频用 video_url，图片用 image_url）
  const mediaContent = isVideo
    ? {
      type: 'video_url' as const,
      video_url: { url: mediaUrl }
    }
    : {
      type: 'image_url' as const,
      image_url: { url: mediaUrl }
    };

  const messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string | Array<{ type: string; text?: string; image_url?: { url: string }; video_url?: { url: string } }> }> = [
    {
      role: 'user',
      content: [
        mediaContent,
        {
          type: 'text',
          text: isVideo ? '请观看完整视频，描述素材的3个关键词。' : '描述素材的3个关键词。'
        }
      ]
    }
  ];

  devLog('🔍 描述视频意图:', {
    fileType: file.type,
    mimeType: mimeType,
    fileSize: file.size,
    isVideo,
    mediaType: isVideo ? 'video_url' : 'image_url',
    mediaUrlLength: mediaUrl.length,
    mediaUrlPrefix: mediaUrl.substring(0, 50) + '...',
    model: 'google/gemini-3-pro-preview' // 固定使用 Gemini 3 Pro Preview（能读懂视频）
  });

  // 只使用 Gemini 3 Pro Preview（能读懂视频），不尝试其他模型
  try {
    const result = await safeChatCompletion({
      model: 'google/gemini-3-pro-preview',
      messages,
      temperature: 0.5
    });
    devLog('✅ Gemini 3 Pro Preview 成功');
    return result;
  } catch (error: any) {
    console.error('❌ Gemini 3 Pro Preview 失败:', error);
    // 失败时返回默认描述，不尝试其他模型
    const fileType = file.type.startsWith('video/') ? '视频' : file.type.startsWith('image/') ? '图片' : '素材';
    const defaultDescription = `${fileType}素材，文件大小${(file.size / 1024 / 1024).toFixed(2)}MB`;
    devLog('📝 使用默认描述:', defaultDescription);
    return defaultDescription;
  }
};

// 分析视频注意力心流
const analyzeFlowAttention = async (file: File, model?: string): Promise<import('./types').FlowAnalysisResult> => {
  let base64Data: string;
  let mimeType: string;
  const isVideo = file.type.startsWith('video/');

  try {
    base64Data = await fileToBase64(file);
    // 对于视频文件，使用 video_url 和正确的 MIME 类型（Gemini 3 Pro 支持完整视频输入）
    mimeType = file.type || (isVideo ? 'video/mp4' : 'image/jpeg');
  } catch (error: any) {
    console.error('❌ 文件处理失败:', error);
    throw new Error(`无法处理文件: ${error.message || '未知错误'}`);
  }

  const mediaUrl = `data:${mimeType};base64,${base64Data}`;

  // 验证 base64 数据格式
  if (!base64Data || base64Data.length === 0) {
    throw new Error('Base64 数据为空，无法发送请求');
  }

  // 检查 base64 数据大小（OpenRouter 可能有大小限制）
  const base64SizeMB = (base64Data.length * 3) / 4 / 1024 / 1024; // 估算原始大小
  if (base64SizeMB > 20) {
    devWarn(`⚠️ Base64 数据较大 (约 ${base64SizeMB.toFixed(2)}MB)，可能超过模型限制`);
  }

  let selectedModel = model || getDefaultModel();

  // 验证模型是否支持多模态，如果不支持则使用备用模型
  const supportsMultimodal = await validateMultimodalModel(selectedModel);
  if (!supportsMultimodal) {
    const fallbackModel = getFallbackMultimodalModel();
    devWarn(`⚠️ 模型 ${selectedModel} 可能不支持多模态输入，切换到备用模型: ${fallbackModel}`);
    selectedModel = fallbackModel;
  }

  devLog('🔍 准备发送多模态请求:', {
    fileType: file.type,
    fileSize: file.size,
    isVideo,
    mimeType: mimeType,
    base64Length: base64Data.length,
    estimatedSizeMB: base64SizeMB.toFixed(2),
    model: selectedModel,
    mediaType: isVideo ? 'video_url' : 'image_url',
    mediaUrlPrefix: mediaUrl.substring(0, 50)
  });

  const systemPrompt = `你是一位极其严格、客观的游戏广告注意力分析专家。你的任务是客观、真实地分析视频广告的注意力心流变化，绝不夸大评分。

## 核心原则：严格客观，绝不虚高
- **默认注意力值应该是 0-30 分**，只有真正出色的内容才能超过 50 分
- **80 分以上是极少数**，只有真正震撼、创新的内容才能达到
- **90 分以上极其罕见**，必须是行业顶尖水准
- **不要因为"还可以"就给高分**，要严格区分"普通"、"良好"、"优秀"、"卓越"

## 评分标准（严格版）
1. **时间粒度**：每1-3秒生成一个数据点
2. **注意力值范围**：0-100分，但必须严格评分
   - **0-20分**：平淡、无吸引力、常规内容
   - **21-40分**：略有看点，但不够突出
   - **41-60分**：有一定吸引力，但缺乏亮点
   - **61-75分**：表现良好，有明显亮点
   - **76-85分**：优秀，有强烈吸引力
   - **86-95分**：卓越，极具冲击力
   - **96-100分**：顶级，行业标杆水准

3. **衰减机制**：如果没有吸引注意力的内容，每1-3秒快速衰减至 0-20 分
4. **提升因素**（必须严格评估，不要轻易给高分）：
   - **惊喜画面**：必须是真正令人意外的创新内容（+20-40分），普通特效不算
   - **挫败感**：必须能真正引发用户情绪波动（+15-30分）
   - **压迫感**：必须营造出强烈的紧张氛围（+20-35分）
   - **悬念**：必须能真正勾起好奇心（+10-25分）
   - **视觉冲击**：必须是真正震撼的画面，普通特效不算（+15-30分）
   - **情感共鸣**：必须能真正触动用户（+10-20分）
   - **节奏变化**：必须是明显的节奏转折（+5-15分）

5. **情绪关键词**：在纵轴上标注情绪关键词（如：惊喜、紧张、兴奋、挫败、压迫、期待、平淡、无聊等）

## 评分示例（参考标准）
- 普通游戏画面、常规操作：**10-25分**
- 获得道具、升级：**30-45分**
- 出现敌人、战斗：**40-55分**
- 特效画面、技能释放：**50-65分**
- 大型BOSS、震撼场面：**65-80分**
- 创新玩法、意外转折：**70-85分**
- 行业顶级创意、爆款潜质：**85-95分**

## 输出格式（必须严格遵守）
输出纯JSON格式，不要包含任何Markdown代码块标记。

{
  "flowData": [
    {
      "time": 0,
      "attention": 35,
      "emotion": "期待",
      "event": "开场画面"
    },
    {
      "time": 2,
      "attention": 15,
      "emotion": "平淡",
      "event": "过渡画面"
    }
  ],
  "averageAttention": 42.5,
  "timeAbove80": 3,
  "totalTime": 30,
  "percentageAbove80": 10,
  "summary": "综合评语：视频整体注意力保持较好，但在中段有明显下降...",
  "suggestions": [
    "建议1：在10-15秒处增加视觉冲击",
    "建议2：提升中段节奏感"
  ],
  "peakMoments": [
    {
      "time": 5,
      "attention": 75,
      "description": "惊喜画面出现"
    }
  ],
  "lowMoments": [
    {
      "time": 12,
      "attention": 15,
      "description": "过渡画面过于平淡"
    }
  ]
}`;

  // 根据文件类型选择 content type（视频用 video_url，图片用 image_url）
  const mediaContent = isVideo
    ? {
      type: 'video_url' as const,
      video_url: { url: mediaUrl }
    }
    : {
      type: 'image_url' as const,
      image_url: { url: mediaUrl }
    };

  const messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string | Array<{ type: string; text?: string; image_url?: { url: string }; video_url?: { url: string } }> }> = [
    {
      role: 'system',
      content: systemPrompt
    },
    {
      role: 'user',
      content: [
        mediaContent,
        {
          type: 'text',
          text: isVideo
            ? `请严格、客观地分析这个游戏广告**完整视频**的注意力心流变化。

**重要提醒**：
1. 默认注意力值应该是 0-30 分，只有真正出色的内容才能超过 50 分
2. 80 分以上是极少数，只有真正震撼、创新的内容才能达到
3. 不要因为"还可以"就给高分，要严格区分"普通"、"良好"、"优秀"、"卓越"
4. 如果内容平淡、常规，应该给 10-25 分，而不是 40-60 分
5. 只有真正有爆款潜质的内容才能给 80 分以上

按照时间线分析每个时刻的注意力值、情绪关键词和关键事件。输出纯JSON格式，不要包含任何Markdown标记。`
            : `请严格、客观地分析这个游戏广告素材的注意力心流变化。

**重要提醒**：
1. 默认注意力值应该是 0-30 分，只有真正出色的内容才能超过 50 分
2. 80 分以上是极少数，只有真正震撼、创新的内容才能达到
3. 不要因为"还可以"就给高分，要严格区分"普通"、"良好"、"优秀"、"卓越"
4. 如果内容平淡、常规，应该给 10-25 分，而不是 40-60 分
5. 只有真正有爆款潜质的内容才能给 80 分以上

按照时间线分析每个时刻的注意力值、情绪关键词和关键事件。输出纯JSON格式，不要包含任何Markdown标记。`
        }
      ]
    }
  ];

  devLog('🚀 开始分析注意力心流:', {
    model: selectedModel,
    fileType: file.type,
    isVideo,
    mimeType: mimeType,
    fileSize: file.size,
    mediaType: isVideo ? 'video_url' : 'image_url',
    mediaUrlPrefix: mediaUrl.substring(0, 50) + '...'
  });

  const text = await safeChatCompletion({
    model: selectedModel,
    messages,
    temperature: 0.3,
    response_format: { type: 'json_object' }
  });

  devLog('✅ 注意力心流分析完成，原始响应长度:', text?.length || 0);

  if (!text) {
    throw new Error('AI分析返回空结果');
  }

  // 提取JSON
  let jsonText = extractJson(text);
  let result: any; // import('./types').FlowAnalysisResult;

  try {
    result = JSON.parse(jsonText);
  } catch (parseError: any) {
    console.error('❌ JSON解析失败:', parseError);
    console.error('原始文本长度:', jsonText.length);
    console.error('原始文本前500字符:', jsonText.substring(0, 500));
    console.error('原始文本后500字符:', jsonText.substring(Math.max(0, jsonText.length - 500)));

    // 尝试修复截断的 JSON
    try {
      jsonText = fixTruncatedJson(jsonText);
      result = JSON.parse(jsonText);
      devLog('✅ 通过修复截断JSON成功解析');
    } catch (fixError: any) {
      console.error('❌ JSON修复也失败:', fixError);
      // 如果修复失败，尝试提取部分数据
      try {
        result = extractPartialFlowData(jsonText);
        devLog('✅ 使用部分数据成功解析');
      } catch (partialError: any) {
        console.error('❌ 部分数据提取也失败:', partialError);
        throw new Error(`JSON解析失败: ${parseError.message}。原始文本长度: ${jsonText.length}`);
      }
    }
  }

  // 验证和补充数据
  if (!result.flowData || !Array.isArray(result.flowData)) {
    throw new Error('flowData字段缺失或格式错误');
  }

  // 确保所有数据点都有必要字段
  result.flowData = result.flowData.map((point: any, index: any) => ({
    time: point.time ?? index * 2,
    attention: Math.max(0, Math.min(100, point.attention ?? 0)),
    emotion: point.emotion || '平静',
    event: point.event || ''
  }));

  // 计算统计数据
  if (!result.totalTime && result.flowData.length > 0) {
    result.totalTime = Math.max(...result.flowData.map((p: any) => p.time));
  }

  if (!result.averageAttention) {
    const sum = result.flowData.reduce((acc: any, p: any) => acc + p.attention, 0);
    result.averageAttention = sum / result.flowData.length;
  }

  if (!result.timeAbove80) {
    result.timeAbove80 = result.flowData.filter((p: any) => p.attention >= 80).length * 2; // 假设每2秒一个点
  }

  if (!result.percentageAbove80 && result.totalTime) {
    result.percentageAbove80 = (result.timeAbove80 / result.totalTime) * 100;
  }

  if (!result.summary) {
    result.summary = '视频注意力分析完成。';
  }

  if (!result.suggestions || !Array.isArray(result.suggestions)) {
    result.suggestions = [];
  }

  if (!result.peakMoments || !Array.isArray(result.peakMoments)) {
    result.peakMoments = [];
  }

  if (!result.lowMoments || !Array.isArray(result.lowMoments)) {
    result.lowMoments = [];
  }

  devLog('✅ 注意力心流分析结果:', {
    dataPoints: result.flowData.length,
    averageAttention: result.averageAttention,
    percentageAbove80: result.percentageAbove80
  });

  return result;
};

// 图片生成函数
export const generateImage = async (params: {
  prompt: string;
  model?: string; // 默认使用支持图片生成的模型
  aspect_ratio?: string; // "1:1", "16:9", "4:3", "2:3", "3:2", "3:4", "4:5", "5:4", "9:16", "21:9"
  image_size?: string; // "1K", "2K", "4K" (仅 Gemini 模型支持)
}): Promise<ImageGenerationResult> => {
  // 默认使用支持图片生成的模型
  const selectedModel = params.model || 'google/gemini-3-pro-image-preview';

  const messages = [
    {
      role: 'user' as const,
      content: params.prompt
    }
  ];

  const imageConfig: any = {};
  if (params.aspect_ratio) {
    imageConfig.aspect_ratio = params.aspect_ratio;
  }
  if (params.image_size) {
    imageConfig.image_size = params.image_size;
  }

  devLog('🎨 开始生成图片:', {
    model: selectedModel,
    prompt: params.prompt.substring(0, 100) + (params.prompt.length > 100 ? '...' : ''),
    aspect_ratio: params.aspect_ratio,
    image_size: params.image_size
  });

  try {
    const response = await safeChatCompletion({
      model: selectedModel,
      messages,
      temperature: 0.7,
      modalities: ['image', 'text'], // 启用图片生成
      image_config: Object.keys(imageConfig).length > 0 ? imageConfig : undefined
    });

    // 解析响应（可能是 JSON 格式，包含 images 和 text）
    let result: any; // ImageGenerationResult;
    try {
      const parsed = JSON.parse(response);
      if (parsed.images && Array.isArray(parsed.images)) {
        result = {
          images: parsed.images,
          text: parsed.text || ''
        };
      } else {
        // 如果解析失败，可能是纯文本响应
        throw new Error('响应格式不正确');
      }
    } catch (e) {
      // 如果解析失败，尝试从响应中提取图片
      // 这种情况不应该发生，但为了健壮性还是处理一下
      devWarn('⚠️ 响应解析失败，尝试其他方式:', e);
      result = {
        images: [],
        text: response
      };
    }

    devLog('✅ 图片生成完成:', {
      imageCount: result.images.length,
      hasText: !!result.text
    });

    return result;
  } catch (error: any) {
    const errorMsg = extractErrorMessage(error);
    console.error('❌ 图片生成失败:', errorMsg);
    throw new Error(`图片生成失败: ${errorMsg}`);
  }
};
