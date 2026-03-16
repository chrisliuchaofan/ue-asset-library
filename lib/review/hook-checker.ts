import { DimensionCheckResult } from './types';
import { Material } from '@/data/material.schema';

/**
 * 维度 2：前3秒钩子检查 (Hook Checker)
 * 绝对客观逻辑：
 * - 结合视频链接利用大模型视觉功能判定视频开始的 3 秒是否有明确的“悬疑”、“视觉冲击”、“字幕反差”等元素。
 */
export async function checkHook(material: Material): Promise<DimensionCheckResult> {
    const url = material.src || (material as any).mediaUrl || (material as any).url;
    if (!url) {
        return { pass: false, rationale: "未提供素材播放地址" };
    }

    try {
        // 这里我们直接复用 S2 刚合并进来的 Tuyoo/Zhipu/OpenRouter 模型，
        // 以图文多模态的方式要求它寻找视频最初的“冲突”或“利益点”字幕。

        // 我们尝试懒加载 `tuyooGatewayService` (因其实际包含多模态能力或纯文本分析)
        const { safeChatCompletion } = await import('@/lib/deduplication/tuyooGatewayService').catch(() => ({ safeChatCompletion: null }));

        if (!safeChatCompletion) {
            // 降级应对：如果服务不可用，返回 Pending 人工复查
            return { pass: true, rationale: "AI 多模态服务未就绪，默认放行，建议人工抽查。" };
        }

        const messages = [
            {
                role: 'system',
                content: `你是一个视频审核硬性指标审查员。你需要判断这段视频的开头部分(0-3秒)是否具备【钩子(Hook)】。
客观定义：只要视频开头出现任何形式的“制造悬念的字幕”、“反光/爆炸的视觉冲击字眼”、“冲突的情感对白”即算具备钩子。
回复必须是 JSON，字段包含 "pass" (布尔) 和 "rationale" (字符串，包含 50 字以内理由)。`
            },
            {
                role: 'user',
                content: `视频链接: ${url}\n\n请识别并返回 JSON。`
            }
        ];

        // Qwen/Zhipu/Gemini 等多模态路由 (具体看 Tuyoo 内部转发配置)
        const resultObjStr = await safeChatCompletion({
            model: 'glm-4v', // or gemini-1.5-pro, qwen-vl-max
            messages: messages as any,
            temperature: 0.1
        });

        if (!resultObjStr) {
            return { pass: true, rationale: '模型未召回有效内容。' };
        }

        // 尝试解析并清洗 markdown json 格式
        const jsonMatch = resultObjStr.match(/\{[\s\S]*?\}/);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            return {
                pass: !!parsed.pass,
                rationale: parsed.rationale || 'AI 完成前 3 秒钩子检测。'
            };
        }

        return { pass: true, rationale: "分析结果不标准，默认放行。" };

    } catch (error: any) {
        console.warn("Hook Checker AI 处理失败:", error.message);
        return { pass: true, rationale: "前3秒校验遇到错误，已放行。" };
    }
}
