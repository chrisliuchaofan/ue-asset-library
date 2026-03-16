import type { AIProvider, AIGenerateTextRequest, AIGenerateTextResponse } from '../types';

export class TuyooProvider implements AIProvider {
    name = 'TuyooGateway';
    type = 'tuyoo' as const;

    private endpoint = process.env.TUYOO_LLM_BASE_URL || 'https://relay.tuyoo.com/v1';
    private apiKey = process.env.LLM_TOKEN;
    private defaultModel = process.env.TUYOO_LLM_DEFAULT_MODEL || 'tuyoo-search-qwen';

    async generateText(request: AIGenerateTextRequest): Promise<AIGenerateTextResponse> {
        if (!this.apiKey) {
            throw new Error('Tuyoo API密钥未配置 (需配置 LLM_TOKEN)');
        }

        const model = request.model || this.defaultModel;

        // 构建 messages
        const messages: Array<{ role: string; content: string | any[] }> = [];
        if (request.systemPrompt) {
            messages.push({
                role: 'system',
                content: request.systemPrompt,
            });
        }

        // 如果 prompt 是字符串
        messages.push({
            role: 'user',
            content: request.prompt,
        });

        // OpenAI 兼容格式
        const requestBody: any = {
            model,
            messages,
            max_tokens: request.maxTokens || 4096,
            temperature: request.temperature ?? 0.7,
            stream: false,
        };

        if (request.responseFormat === 'json') {
            requestBody.response_format = { type: 'json_object' };
        }

        const maxRetries = 3;
        let lastError: Error | null = null;

        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout

                const response = await fetch(`${this.endpoint}/chat/completions`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${this.apiKey}`,
                    },
                    body: JSON.stringify(requestBody),
                    signal: controller.signal,
                });

                clearTimeout(timeoutId);

                if (!response.ok) {
                    const errorText = await response.text();
                    const err = new Error(`Tuyoo API 请求失败: ${response.status} ${errorText}`);
                    if (response.status === 400 || response.status === 401 || response.status === 404) {
                        throw err; // 不要重试 4xx 错误
                    }
                    throw err;
                }

                const data = await response.json();
                const text = data.choices?.[0]?.message?.content || '';

                if (!text) {
                    throw new Error('Tuyoo API 返回空响应');
                }

                return {
                    text,
                    raw: data,
                };
            } catch (error: any) {
                lastError = error;

                if (error.name === 'AbortError') {
                    lastError = new Error('Tuyoo API 请求超时（60秒）');
                }

                const msg = lastError?.message;
                if (msg && (msg.includes('400') || msg.includes('401') || msg.includes('404'))) {
                    throw lastError;
                }

                if (attempt < maxRetries - 1) {
                    const delay = 2000 * (attempt + 1);
                    console.log(`[Tuyoo Provider] ⏳ ${delay / 1000}s 后重试…`);
                    await new Promise((r) => setTimeout(r, delay));
                }
            }
        }

        const finalError = lastError ?? new Error('太石网关请求失败');
        const finalMsg = finalError.message;
        if (/503|502|504|unavailable/i.test(finalMsg)) {
            throw new Error('太石网关暂时不可用 (503/502/504)，请稍后重试。若持续出现可联系网关管理员。');
        }
        throw finalError;
    }
}
