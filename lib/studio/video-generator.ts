/**
 * 视频生成器 — 顺序提交视频任务，返回 taskId 列表
 *
 * 与 storyboard-generator.ts（并发批量等完成）不同：
 * - 顺序提交（成本高 + 频率限制）
 * - 只负责提交，不等待完成
 * - 客户端通过 /api/studio/video-status 轮询状态
 */

import { aiService } from '@/lib/ai/ai-service';
import type {
    VideoGenerateRequest,
    VideoSceneSubmitResult,
    VideoProviderType,
} from './types';
import type { AIProviderType } from '@/lib/ai/types';

/** VideoProviderType → AIProviderType 映射 */
function mapVideoProvider(provider: VideoProviderType): AIProviderType {
    switch (provider) {
        case 'jimeng': return 'jimeng';
        case 'kling': return 'kling';
        default: return 'jimeng';
    }
}

/** 视频 prompt 增强 */
function enhanceVideoPrompt(prompt: string): string {
    if (!prompt) return '游戏广告视频，流畅运镜，高质量画面';
    return `游戏广告视频，流畅运镜，${prompt}，高质量画面，电影感`;
}

/**
 * 顺序提交视频生成任务
 *
 * 返回每个场景的 taskId（成功）或 error（失败）
 * 客户端拿到 taskId 后轮询 /api/studio/video-status 获取结果
 */
export async function submitVideoGeneration(
    req: VideoGenerateRequest,
): Promise<VideoSceneSubmitResult[]> {
    const results: VideoSceneSubmitResult[] = [];
    const providerType = mapVideoProvider(req.provider);

    for (const scene of req.scenes) {
        try {
            // 校验：必须有分镜图
            if (!scene.imageUrl) {
                results.push({
                    sceneId: scene.sceneId,
                    success: false,
                    error: '缺少分镜图，请先生成分镜图',
                });
                continue;
            }

            const response = await aiService.generateVideo({
                imageUrl: scene.imageUrl,
                prompt: enhanceVideoPrompt(scene.prompt),
                duration: Math.min(scene.durationSec, 10), // API 限制最长 10 秒
                provider: req.provider,
                aspectRatio: req.aspectRatio,
            });

            results.push({
                sceneId: scene.sceneId,
                success: true,
                taskId: response.operationId,
            });

            console.log(`[VideoGenerator] 场景 ${scene.sceneId} 提交成功: taskId=${response.operationId}`);
        } catch (error) {
            const errMsg = error instanceof Error ? error.message : '视频生成提交失败';
            console.error(`[VideoGenerator] 场景 ${scene.sceneId} 提交失败:`, errMsg);
            results.push({
                sceneId: scene.sceneId,
                success: false,
                error: errMsg,
            });
            // 不中断：继续提交其他场景
        }
    }

    return results;
}
