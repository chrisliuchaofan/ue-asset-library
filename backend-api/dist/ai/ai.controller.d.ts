import { ModelAdapterService } from './model-adapter.service';
export declare class AiController {
    private modelAdapterService;
    constructor(modelAdapterService: ModelAdapterService);
    getPresets(): Promise<{
        presets: import("./model-presets").ModelPreset[];
    }>;
    generateText(user: {
        userId: string;
        email: string;
    }, body: {
        prompt: string;
        presetId: string;
        systemPrompt?: string;
        provider?: 'qwen' | 'siliconflow' | 'ollama';
        model?: string;
        maxTokens?: number;
        temperature?: number;
    }): Promise<{
        text: string;
        raw: any;
        preset: {
            id: string;
            name: string;
        };
    }>;
}
