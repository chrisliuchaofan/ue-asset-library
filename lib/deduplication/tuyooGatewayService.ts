/**
 * 太石 LLM 网关服务
 * 使用公司网关 relay.tuyoo.com（OpenAI 兼容），模型命名以《太石LLM网关服务手册》为准
 */

import { openaiChatCompletions, type OpenAIChatBody } from './openaiCompatibleChat';
import { TUYOO_DEFAULT_MODEL, getTuyooModelIds, isTuyooModelId } from './config/tuyoo-models';
import { devLog, devWarn } from './utils/devLog';

export type SafeChatCompletionParams = {
  model: string;
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string | Array<{ type: string; text?: string; image_url?: { url: string }; video_url?: { url: string } }> }>;
  temperature?: number;
  max_tokens?: number;
  response_format?: { type: string };
};

function getBaseUrl(): string {
  const inBrowser = typeof window !== 'undefined';
  if (inBrowser) return '/api/tuyoo';
  return (process.env as any).TUYOO_LLM_BASE_URL || 'https://relay.tuyoo.com/v1';
}

function getApiKey(): string | undefined {
  return (process.env as any).LLM_TOKEN;
}

/** 与 openRouterService 一致：将 messages 格式化为 OpenAI 兼容的 content */
function formatMessages(
  messages: SafeChatCompletionParams['messages']
): OpenAIChatBody['messages'] {
  return messages.map((msg) => {
    if (typeof msg.content === 'string') {
      return { role: msg.role, content: msg.content };
    }
    const contentArray = Array.isArray(msg.content) ? msg.content : [msg.content];
    const formatted: any[] = [];
    for (const item of contentArray) {
      if (typeof item === 'string') {
        formatted.push({ type: 'text', text: item });
      } else if (item && typeof item === 'object') {
        if (item.type === 'image_url' && item.image_url) {
          formatted.push({ type: 'image_url', image_url: { url: item.image_url.url } });
        } else if (item.type === 'video_url' && item.video_url) {
          formatted.push({ type: 'video_url', video_url: { url: item.video_url.url } });
        } else if (item.type === 'text' && item.text) {
          formatted.push({ type: 'text', text: item.text });
        } else {
          formatted.push(item);
        }
      }
    }
    return { role: msg.role, content: formatted };
  });
}

/**
 * 太石网关 Chat 调用（与 openRouterService.safeChatCompletion 同签名，便于切换）
 * 网关不支持 video_url 时可能 400，由 aiService 层 fallback 到 OpenRouter/智谱
 */
export async function safeChatCompletion(params: SafeChatCompletionParams): Promise<string> {
  const baseUrl = getBaseUrl();
  const apiKey = getApiKey();
  const model = params.model || (process.env as any).TUYOO_LLM_DEFAULT_MODEL || TUYOO_DEFAULT_MODEL;
  if (!isTuyooModelId(model)) {
    devWarn('⚠️ 太石网关可能不支持该模型 ID，请以《太石LLM网关服务手册》为准:', model);
  }
  const messages = formatMessages(params.messages);
  const body: OpenAIChatBody = {
    model,
    messages,
    temperature: params.temperature ?? 0.7,
    max_tokens: params.max_tokens ?? 4096,
  };
  if (params.response_format) {
    body.response_format = params.response_format;
  }
  const maxRetries = 3;
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      if (attempt > 0) devLog(`🔄 太石网关重试 (${attempt}/${maxRetries})...`);
      const content = await openaiChatCompletions(baseUrl, apiKey || undefined, body);
      devLog('✅ 太石网关调用成功');
      return content;
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
      const msg = lastError.message;
      if (msg && (msg.includes('400') || msg.includes('401') || msg.includes('404'))) {
        throw lastError;
      }
      if (attempt < maxRetries - 1) {
        const delay = msg && /503|502|504|unavailable/i.test(msg) ? 2000 * (attempt + 1) : 1000 * (attempt + 1);
        devLog(`⏳ ${delay / 1000}s 后重试…`);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }
  const finalMsg = lastError?.message ?? '太石网关请求失败';
  if (/503|502|504|unavailable/i.test(finalMsg)) {
    throw new Error('太石网关暂时不可用 (503/502/504)，请稍后重试。若持续出现可联系网关管理员。');
  }
  throw lastError || new Error('太石网关请求失败');
}

export { getTuyooModelIds, isTuyooModelId, TUYOO_DEFAULT_MODEL };
export { TUYOO_GATEWAY_MODELS, TUYOO_MULTIMODAL_MODEL_IDS } from './config/tuyoo-models';
