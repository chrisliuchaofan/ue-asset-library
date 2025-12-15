import { z } from 'zod';
export declare const TextGenerationJobInputSchema: z.ZodObject<{
    prompt: z.ZodString;
    presetId: z.ZodOptional<z.ZodString>;
    systemPrompt: z.ZodOptional<z.ZodString>;
    provider: z.ZodOptional<z.ZodEnum<["qwen", "siliconflow", "ollama"]>>;
    model: z.ZodOptional<z.ZodString>;
    maxTokens: z.ZodOptional<z.ZodNumber>;
    temperature: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    provider?: "qwen" | "siliconflow" | "ollama";
    model?: string;
    prompt?: string;
    presetId?: string;
    systemPrompt?: string;
    maxTokens?: number;
    temperature?: number;
}, {
    provider?: "qwen" | "siliconflow" | "ollama";
    model?: string;
    prompt?: string;
    presetId?: string;
    systemPrompt?: string;
    maxTokens?: number;
    temperature?: number;
}>;
export type TextGenerationJobInput = z.infer<typeof TextGenerationJobInputSchema>;
export declare const TextGenerationJobOutputSchema: z.ZodObject<{
    text: z.ZodString;
    raw: z.ZodOptional<z.ZodAny>;
    preset: z.ZodOptional<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id?: string;
        name?: string;
    }, {
        id?: string;
        name?: string;
    }>>;
}, "strip", z.ZodTypeAny, {
    raw?: any;
    text?: string;
    preset?: {
        id?: string;
        name?: string;
    };
}, {
    raw?: any;
    text?: string;
    preset?: {
        id?: string;
        name?: string;
    };
}>;
export type TextGenerationJobOutput = z.infer<typeof TextGenerationJobOutputSchema>;
export declare const ImageGenerationJobInputSchema: z.ZodObject<{
    prompt: z.ZodString;
    negativePrompt: z.ZodOptional<z.ZodString>;
    width: z.ZodOptional<z.ZodNumber>;
    height: z.ZodOptional<z.ZodNumber>;
    steps: z.ZodOptional<z.ZodNumber>;
    guidanceScale: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    steps?: number;
    prompt?: string;
    negativePrompt?: string;
    width?: number;
    height?: number;
    guidanceScale?: number;
}, {
    steps?: number;
    prompt?: string;
    negativePrompt?: string;
    width?: number;
    height?: number;
    guidanceScale?: number;
}>;
export type ImageGenerationJobInput = z.infer<typeof ImageGenerationJobInputSchema>;
export declare const ImageGenerationJobOutputSchema: z.ZodObject<{
    imageUrl: z.ZodString;
    thumbnailUrl: z.ZodOptional<z.ZodString>;
    width: z.ZodOptional<z.ZodNumber>;
    height: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    width?: number;
    height?: number;
    imageUrl?: string;
    thumbnailUrl?: string;
}, {
    width?: number;
    height?: number;
    imageUrl?: string;
    thumbnailUrl?: string;
}>;
export type ImageGenerationJobOutput = z.infer<typeof ImageGenerationJobOutputSchema>;
export declare const VideoGenerationJobInputSchema: z.ZodObject<{
    prompt: z.ZodString;
    imageUrl: z.ZodOptional<z.ZodString>;
    duration: z.ZodOptional<z.ZodNumber>;
    fps: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    prompt?: string;
    imageUrl?: string;
    duration?: number;
    fps?: number;
}, {
    prompt?: string;
    imageUrl?: string;
    duration?: number;
    fps?: number;
}>;
export type VideoGenerationJobInput = z.infer<typeof VideoGenerationJobInputSchema>;
export declare const VideoGenerationJobOutputSchema: z.ZodObject<{
    videoUrl: z.ZodString;
    thumbnailUrl: z.ZodOptional<z.ZodString>;
    duration: z.ZodOptional<z.ZodNumber>;
    fps: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    thumbnailUrl?: string;
    duration?: number;
    fps?: number;
    videoUrl?: string;
}, {
    thumbnailUrl?: string;
    duration?: number;
    fps?: number;
    videoUrl?: string;
}>;
export type VideoGenerationJobOutput = z.infer<typeof VideoGenerationJobOutputSchema>;
export declare function validateJobInput(type: string, input: any): {
    valid: boolean;
    error?: string;
    data?: any;
};
export declare function validateJobOutput(type: string, output: any): {
    valid: boolean;
    error?: string;
    data?: any;
};
