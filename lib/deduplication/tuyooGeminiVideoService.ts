import { GoogleGenAI } from '@google/genai';

const DEFAULT_MAX_INLINE_VIDEO_BYTES = 24 * 1024 * 1024;

function getApiKey(): string | undefined {
  return process.env.LLM_TOKEN || process.env.TAISHI_API_KEY;
}

function getGeminiGatewayBaseUrl(): string {
  const configured = process.env.TUYOO_GEMINI_BASE_URL
    || process.env.TAISHI_GEMINI_BASE_URL
    || process.env.TUYOO_LLM_BASE_URL
    || process.env.TAISHI_BASE_URL
    || 'https://relay.tuyoo.com';

  return configured
    .replace(/\/+$/, '')
    .replace(/\/v1(beta|alpha)?$/i, '');
}

function getMimeType(url: string, response: Response): string {
  const fromHeader = response.headers.get('content-type')?.split(';')[0]?.trim();
  if (fromHeader?.startsWith('video/')) return fromHeader;
  if (/\.webm(\?|#|$)/i.test(url)) return 'video/webm';
  if (/\.mov(\?|#|$)/i.test(url)) return 'video/quicktime';
  return 'video/mp4';
}

function createClient(): GoogleGenAI {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('太石 Gemini 视频接口密钥未配置');
  }

  return new GoogleGenAI({
    apiKey,
    apiVersion: process.env.TUYOO_GEMINI_API_VERSION || 'v1beta',
    httpOptions: {
      baseUrl: getGeminiGatewayBaseUrl(),
    },
  });
}

export async function generateGeminiVideoContent(params: {
  model: string;
  videoUrl: string;
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  maxInlineBytes?: number;
}): Promise<string> {
  const maxBytes = params.maxInlineBytes ?? DEFAULT_MAX_INLINE_VIDEO_BYTES;
  const response = await fetch(params.videoUrl, { redirect: 'follow' });

  if (!response.ok) {
    throw new Error(`视频文件读取失败: HTTP ${response.status}`);
  }

  const contentLength = Number(response.headers.get('content-length') || 0);
  if (contentLength > maxBytes) {
    throw new Error(`视频文件过大 (${(contentLength / 1024 / 1024).toFixed(1)}MB)，缺少审核专用压缩视频`);
  }

  const arrayBuffer = await response.arrayBuffer();
  if (arrayBuffer.byteLength > maxBytes) {
    throw new Error(`视频文件过大 (${(arrayBuffer.byteLength / 1024 / 1024).toFixed(1)}MB)，缺少审核专用压缩视频`);
  }

  const mimeType = getMimeType(params.videoUrl, response);
  const ai = createClient();
  const result = await ai.models.generateContent({
    model: params.model,
    contents: [
      {
        role: 'user',
        parts: [
          { text: params.userPrompt },
          {
            inlineData: {
              mimeType,
              data: Buffer.from(arrayBuffer).toString('base64'),
            },
          },
        ],
      },
    ],
    config: {
      systemInstruction: params.systemPrompt,
      temperature: params.temperature ?? 0.1,
      responseMimeType: 'application/json',
    },
  });

  const text = result.text || '';
  if (!text) {
    throw new Error('Gemini 视频接口返回空响应');
  }

  return text;
}
