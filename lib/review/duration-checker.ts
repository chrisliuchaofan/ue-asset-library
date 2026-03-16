import { DimensionCheckResult } from './types';
import { Material } from '@/data/material.schema';

/**
 * 维度 1：时长规范检查
 * 绝对客观：
 * - 微短剧/小游戏：一般时长必须在 [15, 60] 秒之间（作为演示规则）
 * - 如果是图片，跳过或返回通过
 */
export async function checkDuration(material: Material): Promise<DimensionCheckResult> {
    // 1. 若非视频类型 / 没有 duration，视作不适用，默认给 pass
    if (!material.duration || material.duration <= 0) {
        return {
            pass: true,
            rationale: '非视频类型或未提供时长，跳过考核。'
        };
    }

    const durationSec = material.duration;

    // 假设小游戏投流素材建议在 15s 到 60s
    // 仅作为一个纯客观业务限制
    const MIN_DUR = 15;
    const MAX_DUR = 60;

    if (durationSec < MIN_DUR) {
        return {
            pass: false,
            rationale: `视频过短 (${durationSec.toFixed(1)}s < ${MIN_DUR}s)，不符合主流分发规范。`
        };
    }

    if (durationSec > MAX_DUR) {
        return {
            pass: false,
            rationale: `视频过长 (${durationSec.toFixed(1)}s > ${MAX_DUR}s)，完播率风险极高。`
        };
    }

    return {
        pass: true,
        rationale: `时长 (${durationSec.toFixed(1)}s) 位于标准范围 [${MIN_DUR}s - ${MAX_DUR}s] 内。`
    };
}
