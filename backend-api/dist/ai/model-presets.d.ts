export interface ModelPreset {
    id: string;
    name: string;
    provider: 'qwen' | 'siliconflow' | 'ollama';
    model: string;
    maxTokens: number;
    temperature: number;
    systemPrompt?: string;
    description: string;
}
export declare const MODEL_PRESETS: ModelPreset[];
export declare function getPreset(presetId: string): ModelPreset | null;
export declare function validatePresetParams(presetId: string, requestedParams: {
    provider?: string;
    model?: string;
    maxTokens?: number;
    temperature?: number;
}): {
    valid: boolean;
    error?: string;
    preset?: ModelPreset;
};
export declare function getAllPresets(): ModelPreset[];
