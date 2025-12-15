"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MODEL_PRESETS = void 0;
exports.getPreset = getPreset;
exports.validatePresetParams = validatePresetParams;
exports.getAllPresets = getAllPresets;
exports.MODEL_PRESETS = [
    {
        id: 'qwen-turbo-fast',
        name: 'Qwen Turbo 快速模式',
        provider: 'qwen',
        model: 'qwen-turbo',
        maxTokens: 1000,
        temperature: 0.7,
        description: '快速文本生成，适合简单任务',
    },
    {
        id: 'qwen-turbo-standard',
        name: 'Qwen Turbo 标准模式',
        provider: 'qwen',
        model: 'qwen-turbo',
        maxTokens: 2000,
        temperature: 0.7,
        description: '标准文本生成，平衡速度和质量',
    },
    {
        id: 'qwen-turbo-creative',
        name: 'Qwen Turbo 创意模式',
        provider: 'qwen',
        model: 'qwen-turbo',
        maxTokens: 2000,
        temperature: 0.9,
        description: '创意文本生成，适合需要想象力的任务',
    },
    {
        id: 'qwen-plus-standard',
        name: 'Qwen Plus 标准模式',
        provider: 'qwen',
        model: 'qwen-plus',
        maxTokens: 2000,
        temperature: 0.7,
        description: '高质量文本生成，适合复杂任务',
    },
    {
        id: 'siliconflow-deepseek',
        name: 'SiliconFlow DeepSeek',
        provider: 'siliconflow',
        model: 'deepseek-ai/DeepSeek-V2.5',
        maxTokens: 2000,
        temperature: 0.7,
        description: 'DeepSeek 模型，高质量输出',
    },
];
function getPreset(presetId) {
    return exports.MODEL_PRESETS.find(p => p.id === presetId) || null;
}
function validatePresetParams(presetId, requestedParams) {
    const preset = getPreset(presetId);
    if (!preset) {
        return {
            valid: false,
            error: `无效的预设ID: ${presetId}`,
        };
    }
    if (requestedParams.provider && requestedParams.provider !== preset.provider) {
        return {
            valid: false,
            error: `Provider 不匹配：预设为 ${preset.provider}，请求为 ${requestedParams.provider}`,
        };
    }
    if (requestedParams.model && requestedParams.model !== preset.model) {
        return {
            valid: false,
            error: `Model 不匹配：预设为 ${preset.model}，请求为 ${requestedParams.model}`,
        };
    }
    if (requestedParams.maxTokens && requestedParams.maxTokens > preset.maxTokens) {
        return {
            valid: false,
            error: `maxTokens 超过预设限制：预设为 ${preset.maxTokens}，请求为 ${requestedParams.maxTokens}`,
        };
    }
    if (requestedParams.temperature !== undefined) {
        if (Math.abs(requestedParams.temperature - preset.temperature) > 0.1) {
            return {
                valid: false,
                error: `Temperature 超出允许范围：预设为 ${preset.temperature}，请求为 ${requestedParams.temperature}`,
            };
        }
    }
    return {
        valid: true,
        preset,
    };
}
function getAllPresets() {
    return exports.MODEL_PRESETS;
}
//# sourceMappingURL=model-presets.js.map