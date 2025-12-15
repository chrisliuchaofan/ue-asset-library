import { ModelAdapterService } from './model-adapter.service';
import { StorageService } from '../storage/storage.service';
import { JobsService } from '../jobs/jobs.service';
export declare class AiController {
    private modelAdapterService;
    private storageService;
    private jobsService;
    constructor(modelAdapterService: ModelAdapterService, storageService: StorageService, jobsService: JobsService);
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
    generateImage(user: {
        userId: string;
        email: string;
    }, body: {
        prompt: string;
        size?: string;
        referenceImageUrl?: string;
        aspectRatio?: string;
        style?: string;
        provider?: string;
        imageUrl?: string;
    }): Promise<{
        imageUrl: string;
    }>;
    generateVideo(user: {
        userId: string;
        email: string;
    }, body: {
        type: 'video';
        imageUrl: string;
        prompt: string;
        duration?: number;
        resolution?: string;
        provider?: string;
        videoUrl?: string;
    }): Promise<{
        videoUrl: string;
    }>;
}
