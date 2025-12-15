export type ModelProvider = 'ollama' | 'siliconflow' | 'qwen';
export interface GenerateContentOptions {
    model?: string;
    systemPrompt?: string;
    maxTokens?: number;
    temperature?: number;
    [key: string]: any;
}
export interface GenerateContentResponse {
    text: string;
    raw?: any;
}
export declare class ModelAdapterService {
    generateContent(input: string, options?: GenerateContentOptions & {
        provider?: ModelProvider;
    }): Promise<GenerateContentResponse>;
    private generateMockResponse;
    private generateWithQwen;
    private generateWithSiliconFlow;
    private generateWithOllama;
    getCurrentProvider(): ModelProvider;
}
