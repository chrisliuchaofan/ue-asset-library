/**
 * 分镜图批量生成服务
 *
 * 遍历脚本场景，调用 AI 文生图 API 生成分镜图。
 * - 并发控制：每批 3 张，使用 Promise.allSettled 隔离错误
 * - Prompt 增强：自动添加前缀/后缀提升出图质量
 * - Provider 映射：ImageProviderType → AIProviderType
 */

import { aiService } from '@/lib/ai/ai-service';
import type { AIProviderType, AIGenerateImageRequest } from '@/lib/ai/types';
import type {
    StoryboardGenerateRequest,
    StoryboardGenerateResult,
    StoryboardSceneResult,
    ImageProviderType,
} from './types';

/** 每批并发数 */
const BATCH_SIZE = 3;

/** Prompt 增强前缀 */
const PROMPT_PREFIX = '游戏广告分镜画面，高质量，';

/** 不同比例的后缀提示 */
const ASPECT_RATIO_SUFFIX: Record<string, string> = {
    '16:9': '，16:9横版构图，电影感光线',
    '9:16': '，9:16竖版构图，手机全屏视角',
    '4:3': '，4:3构图，平衡构图',
    '1:1': '，1:1方形构图，居中对称',
};

/** ImageProviderType → AIProviderType 映射 */
function mapProvider(provider: ImageProviderType): AIProviderType {
    switch (provider) {
        case 'qwen': return 'qwen';
        case 'kling': return 'kling';
        case 'flux': return 'qwen'; // 暂未接入，回退到 qwen
        default: return 'qwen';
    }
}

/** 增强 prompt */
function enhancePrompt(visualPrompt: string, aspectRatio?: string, style?: string): string {
    const suffix = aspectRatio ? (ASPECT_RATIO_SUFFIX[aspectRatio] || '') : '，16:9横版构图，电影感光线';
    const styleHint = style ? `，${style}风格` : '';
    return `${PROMPT_PREFIX}${visualPrompt}${styleHint}${suffix}`;
}

/** 生成单张分镜图 */
async function generateSingleImage(
    sceneId: string,
    visualPrompt: string,
    provider: AIProviderType,
    aspectRatio?: string,
    style?: string,
): Promise<StoryboardSceneResult> {
    try {
        const enhancedPrompt = enhancePrompt(visualPrompt, aspectRatio, style);

        const result = await aiService.generateImage(
            {
                prompt: enhancedPrompt,
                aspectRatio: (aspectRatio as AIGenerateImageRequest['aspectRatio']) || '16:9',
            },
            provider,
        );

        return {
            sceneId,
            success: true,
            imageUrl: result.imageUrl,
        };
    } catch (error) {
        const errMsg = error instanceof Error ? error.message : '图片生成失败';
        console.error(`[Storyboard] 场景 ${sceneId} 图片生成失败:`, errMsg);
        return {
            sceneId,
            success: false,
            error: errMsg,
        };
    }
}

/**
 * 批量生成分镜图
 *
 * @param req 分镜图生成请求
 * @returns 批量生成结果（每个场景独立成功/失败）
 */
export async function generateStoryboard(
    req: StoryboardGenerateRequest,
): Promise<StoryboardGenerateResult> {
    const aiProvider = mapProvider(req.provider);
    const results: StoryboardSceneResult[] = [];

    // 分批并发
    for (let i = 0; i < req.scenes.length; i += BATCH_SIZE) {
        const batch = req.scenes.slice(i, i + BATCH_SIZE);

        const batchResults = await Promise.allSettled(
            batch.map(scene =>
                generateSingleImage(
                    scene.sceneId,
                    scene.visualPrompt,
                    aiProvider,
                    req.aspectRatio,
                    req.style,
                ),
            ),
        );

        batchResults.forEach((result, batchIdx) => {
            if (result.status === 'fulfilled') {
                results.push(result.value);
            } else {
                // Promise 本身 reject（不太可能，因为 generateSingleImage 内部已 catch）
                results.push({
                    sceneId: batch[batchIdx]?.sceneId || 'unknown',
                    success: false,
                    error: result.reason?.message || '未知错误',
                });
            }
        });
    }

    const successCount = results.filter(r => r.success).length;
    const errorCount = results.filter(r => !r.success).length;

    return {
        scriptId: req.scriptId,
        results,
        successCount,
        errorCount,
    };
}
