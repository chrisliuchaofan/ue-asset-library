"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VideoGenerationJobOutputSchema = exports.VideoGenerationJobInputSchema = exports.ImageGenerationJobOutputSchema = exports.ImageGenerationJobInputSchema = exports.TextGenerationJobOutputSchema = exports.TextGenerationJobInputSchema = void 0;
exports.validateJobInput = validateJobInput;
exports.validateJobOutput = validateJobOutput;
const zod_1 = require("zod");
exports.TextGenerationJobInputSchema = zod_1.z.object({
    prompt: zod_1.z.string().min(1, '提示词不能为空'),
    presetId: zod_1.z.string().optional(),
    systemPrompt: zod_1.z.string().optional(),
    provider: zod_1.z.enum(['qwen', 'siliconflow', 'ollama']).optional(),
    model: zod_1.z.string().optional(),
    maxTokens: zod_1.z.number().int().positive().optional(),
    temperature: zod_1.z.number().min(0).max(2).optional(),
});
exports.TextGenerationJobOutputSchema = zod_1.z.object({
    text: zod_1.z.string(),
    raw: zod_1.z.any().optional(),
    preset: zod_1.z.object({
        id: zod_1.z.string(),
        name: zod_1.z.string(),
    }).optional(),
});
exports.ImageGenerationJobInputSchema = zod_1.z.object({
    prompt: zod_1.z.string().min(1, '提示词不能为空'),
    negativePrompt: zod_1.z.string().optional(),
    width: zod_1.z.number().int().positive().optional(),
    height: zod_1.z.number().int().positive().optional(),
    steps: zod_1.z.number().int().positive().max(50).optional(),
    guidanceScale: zod_1.z.number().min(1).max(20).optional(),
});
exports.ImageGenerationJobOutputSchema = zod_1.z.object({
    imageUrl: zod_1.z.string().url(),
    thumbnailUrl: zod_1.z.string().url().optional(),
    width: zod_1.z.number().int().positive().optional(),
    height: zod_1.z.number().int().positive().optional(),
});
exports.VideoGenerationJobInputSchema = zod_1.z.object({
    prompt: zod_1.z.string().min(1, '提示词不能为空'),
    imageUrl: zod_1.z.string().url().optional(),
    duration: zod_1.z.number().int().positive().max(30).optional(),
    fps: zod_1.z.number().int().positive().max(30).optional(),
});
exports.VideoGenerationJobOutputSchema = zod_1.z.object({
    videoUrl: zod_1.z.string().url(),
    thumbnailUrl: zod_1.z.string().url().optional(),
    duration: zod_1.z.number().int().positive().optional(),
    fps: zod_1.z.number().int().positive().optional(),
});
function validateJobInput(type, input) {
    try {
        let schema;
        switch (type) {
            case 'text_generation':
                schema = exports.TextGenerationJobInputSchema;
                break;
            case 'image_generation':
                schema = exports.ImageGenerationJobInputSchema;
                break;
            case 'video_generation':
                schema = exports.VideoGenerationJobInputSchema;
                break;
            default:
                return {
                    valid: false,
                    error: `不支持的任务类型: ${type}`,
                };
        }
        const validated = schema.parse(input);
        return {
            valid: true,
            data: validated,
        };
    }
    catch (error) {
        return {
            valid: false,
            error: error.message || '输入验证失败',
        };
    }
}
function validateJobOutput(type, output) {
    try {
        let schema;
        switch (type) {
            case 'text_generation':
                schema = exports.TextGenerationJobOutputSchema;
                break;
            case 'image_generation':
                schema = exports.ImageGenerationJobOutputSchema;
                break;
            case 'video_generation':
                schema = exports.VideoGenerationJobOutputSchema;
                break;
            default:
                return {
                    valid: false,
                    error: `不支持的任务类型: ${type}`,
                };
        }
        const validated = schema.parse(output);
        return {
            valid: true,
            data: validated,
        };
    }
    catch (error) {
        return {
            valid: false,
            error: error.message || '输出验证失败',
        };
    }
}
//# sourceMappingURL=job-schemas.js.map