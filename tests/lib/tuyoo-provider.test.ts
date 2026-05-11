import { afterEach, describe, expect, it, vi } from 'vitest';
import { TuyooProvider } from '@/lib/ai/providers/tuyoo-provider';

describe('TuyooProvider', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('sends multimodal video analysis messages through the OpenAI-compatible gateway format', async () => {
    vi.stubEnv('LLM_TOKEN', 'test-token');
    vi.stubEnv('TUYOO_LLM_BASE_URL', 'https://gateway.test/v1');

    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: '{"summary":"ok"}' } }],
      }),
    }));
    vi.stubGlobal('fetch', fetchMock);

    const provider = new TuyooProvider();
    const result = await provider.generateText({
      prompt: '请分析这个广告视频。',
      model: 'gemini-3-pro-preview',
      responseFormat: 'json',
      messages: [
        { role: 'system', content: '只输出 JSON' },
        {
          role: 'user',
          content: [
            { type: 'video', video: 'https://cdn.example.com/ad.mp4' },
            { type: 'text', text: '请分析这个广告视频。' },
          ],
        },
      ],
    });

    expect(result.text).toBe('{"summary":"ok"}');
    const [url, init] = fetchMock.mock.calls[0]! as unknown as [string, any];
    expect(url).toBe('https://gateway.test/v1/chat/completions');
    expect(init.headers.Authorization).toBe('Bearer test-token');

    const body = JSON.parse(String(init.body));
    expect(body).toMatchObject({
      model: 'gemini-3-pro-preview',
      response_format: { type: 'json_object' },
    });
    expect(body.messages[1].content[0]).toEqual({
      type: 'video_url',
      video_url: { url: 'https://cdn.example.com/ad.mp4' },
    });
  });
});
