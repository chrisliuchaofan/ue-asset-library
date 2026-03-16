/**
 * OpenAI 兼容 Chat 适配层
 * 供太石网关与 OpenRouter 等共用：POST {baseUrl}/chat/completions，Bearer 鉴权，返回 choices[0].message.content
 */

export type ChatMessage = {
  role: 'user' | 'assistant' | 'system';
  content: string | Array<{ type: string; text?: string; image_url?: { url: string }; video_url?: { url: string } }>;
};

export type OpenAIChatBody = {
  model: string;
  messages: Array<{ role: string; content: string | unknown[] }>;
  temperature?: number;
  max_tokens?: number;
  response_format?: { type: string };
};

/**
 * 调用 OpenAI 兼容的 chat/completions 接口
 * @param baseUrl 如 https://relay.tuyoo.com/v1 或 /api/tuyoo（走代理时）
 * @param apiKey 鉴权 key；当 baseUrl 为相对路径（走代理）时可不传，由代理注入
 * @param body 请求体
 * @returns 响应 content 文本
 */
export async function openaiChatCompletions(
  baseUrl: string,
  apiKey: string | undefined,
  body: OpenAIChatBody
): Promise<string> {
  const url = baseUrl.replace(/\/$/, '') + '/chat/completions';
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (apiKey && !baseUrl.startsWith('/')) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }
  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const errText = await response.text();
    let errMsg: string;
    try {
      const errJson = JSON.parse(errText);
      errMsg = errJson?.error?.message || errJson?.message || errJson?.error || errText;
    } catch {
      errMsg = errText || `${response.status} ${response.statusText}`;
    }
    // 500/503 时在控制台打出网关原始响应，便于排查（如 payload 过大、上游超时等）
    if (response.status >= 500 && response.status < 600 && typeof console !== 'undefined' && console.error) {
      const preview = errText.length > 500 ? errText.slice(0, 500) + '...' : errText;
      console.error(`[Chat API ${response.status}] 网关原始响应:`, preview);
    }
    if (response.status === 503 || response.status === 502 || response.status === 504) {
      throw new Error(`Chat API 请求失败: ${response.status} ${response.statusText}。网关可能暂时过载或不可用，请稍后重试。${errMsg ? ` (${errMsg})` : ''}`);
    }
    if (response.status === 500) {
      throw new Error(`Chat API 请求失败: 500 服务器内部错误。网关或上游模型处理请求时发生异常，请稍后重试；若持续出现可联系网关管理员排查。${errMsg ? ` (${errMsg})` : ''}`);
    }
    if (response.status === 400 && errText) {
      throw new Error(`Chat API 请求失败: 400 Bad Request。${errMsg}${errText.length > 200 ? '' : ` | 原始响应: ${errText}`}`);
    }
    if (response.status === 403 && /无权使用模型|该令牌无权/i.test(String(errMsg))) {
      throw new Error(
        `太石网关 403：当前 Key 无权使用该模型。请在钉钉-工作台-运维服务平台申请对应模型权限，或在 .env.local 中设置 TUYOO_LLM_VIDEO_MODEL / TUYOO_LLM_DEFAULT_MODEL 为已开通的模型（如 glm-4.6、gemini-3-pro-preview）。${errMsg ? ` (${errMsg})` : ''}`
      );
    }
    throw new Error(`Chat API 请求失败: ${response.status} ${errMsg}`);
  }
  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (content == null) {
    throw new Error('Chat API 响应缺少 choices[0].message.content');
  }
  return typeof content === 'string' ? content : JSON.stringify(content);
}
