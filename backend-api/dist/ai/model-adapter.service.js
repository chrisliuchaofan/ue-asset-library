"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ModelAdapterService = void 0;
const common_1 = require("@nestjs/common");
let ModelAdapterService = class ModelAdapterService {
    async generateContent(input, options = {}) {
        const modelEnabled = process.env.MODEL_ENABLED !== 'false';
        if (!modelEnabled) {
            console.log('[ModelAdapter] Dry Run 模式：返回 mock 数据，不调用真实模型');
            return this.generateMockResponse(input, options);
        }
        const provider = options.provider || process.env.MODEL_PROVIDER || 'qwen';
        switch (provider) {
            case 'qwen':
                return this.generateWithQwen(input, options);
            case 'siliconflow':
                return this.generateWithSiliconFlow(input, options);
            case 'ollama':
                return this.generateWithOllama(input, options);
            default:
                throw new Error(`不支持的 provider: ${provider}`);
        }
    }
    generateMockResponse(input, options) {
        const mockText = `[Mock Response] 输入: "${input.substring(0, 50)}${input.length > 50 ? '...' : ''}"\n\n这是一个 Dry Run 模式的模拟响应。实际模型调用已禁用（MODEL_ENABLED=false）。\n\n模型: ${options.model || 'mock-model'}\n温度: ${options.temperature || 0.7}\n最大Token: ${options.maxTokens || 2000}`;
        return {
            text: mockText,
            raw: {
                mock: true,
                dryRun: true,
                input: input.substring(0, 100),
                options,
                timestamp: new Date().toISOString(),
            },
        };
    }
    async generateWithQwen(input, options) {
        const apiKey = process.env.QWEN_API_KEY || process.env.DASHSCOPE_API_KEY;
        if (!apiKey) {
            throw new Error('Qwen API Key 未配置，请设置 QWEN_API_KEY 或 DASHSCOPE_API_KEY 环境变量');
        }
        const model = options.model || process.env.QWEN_MODEL || 'qwen-turbo';
        const baseUrl = process.env.QWEN_BASE_URL || 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation';
        const messages = [];
        if (options.systemPrompt) {
            messages.push({
                role: 'system',
                content: options.systemPrompt,
            });
        }
        messages.push({
            role: 'user',
            content: input,
        });
        const requestBody = {
            model,
            input: {
                messages,
            },
            parameters: {
                temperature: options.temperature ?? 0.7,
                max_tokens: options.maxTokens || 2000,
            },
        };
        try {
            const response = await fetch(baseUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`,
                },
                body: JSON.stringify(requestBody),
            });
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Qwen API 调用失败: ${response.status} ${response.statusText} - ${errorText}`);
            }
            const data = await response.json();
            const text = data.output?.choices?.[0]?.message?.content || '';
            return {
                text,
                raw: data,
            };
        }
        catch (error) {
            throw new Error(`Qwen 调用失败: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    async generateWithSiliconFlow(input, options) {
        const apiKey = process.env.SILICONFLOW_API_KEY;
        if (!apiKey) {
            throw new Error('SiliconFlow API Key 未配置，请设置 SILICONFLOW_API_KEY 环境变量');
        }
        const baseUrl = process.env.SILICONFLOW_BASE_URL || 'https://api.siliconflow.cn/v1';
        const model = options.model || process.env.SILICONFLOW_MODEL || 'deepseek-ai/DeepSeek-V2.5';
        const messages = [];
        if (options.systemPrompt) {
            messages.push({
                role: 'system',
                content: options.systemPrompt,
            });
        }
        messages.push({
            role: 'user',
            content: input,
        });
        const requestBody = {
            model,
            messages,
            temperature: options.temperature ?? 0.7,
            max_tokens: options.maxTokens || 2000,
        };
        try {
            const response = await fetch(`${baseUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`,
                },
                body: JSON.stringify(requestBody),
            });
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`SiliconFlow API 调用失败: ${response.status} ${response.statusText} - ${errorText}`);
            }
            const data = await response.json();
            const text = data.choices?.[0]?.message?.content || '';
            return {
                text,
                raw: data,
            };
        }
        catch (error) {
            throw new Error(`SiliconFlow 调用失败: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    async generateWithOllama(input, options) {
        const baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
        const model = options.model || process.env.OLLAMA_MODEL || 'llama2';
        const requestBody = {
            model,
            prompt: input,
            stream: false,
            options: {
                temperature: options.temperature ?? 0.7,
            },
        };
        if (options.maxTokens) {
            requestBody.options.num_predict = options.maxTokens;
        }
        if (options.systemPrompt) {
            requestBody.system = options.systemPrompt;
        }
        try {
            const response = await fetch(`${baseUrl}/api/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody),
            });
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Ollama API 调用失败: ${response.status} ${response.statusText} - ${errorText}`);
            }
            const data = await response.json();
            const text = data.response || '';
            return {
                text,
                raw: data,
            };
        }
        catch (error) {
            throw new Error(`Ollama 调用失败: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    getCurrentProvider() {
        return process.env.MODEL_PROVIDER || 'qwen';
    }
};
exports.ModelAdapterService = ModelAdapterService;
exports.ModelAdapterService = ModelAdapterService = __decorate([
    (0, common_1.Injectable)()
], ModelAdapterService);
//# sourceMappingURL=model-adapter.service.js.map