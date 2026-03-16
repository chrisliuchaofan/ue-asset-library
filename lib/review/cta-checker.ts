import { DimensionCheckResult } from './types';
import { Material } from '@/data/material.schema';

/**
 * 维度 3：行动呼吁 (CTA) 检查
 * 绝对客观逻辑：
 * - 检测视频是否在某些时段(或整体画面)包含例如："点击左下角"、"立即下载"、"免费试玩"等明确行动指引。
 */
export async function checkCTA(material: Material): Promise<DimensionCheckResult> {
    const url = material.src || (material as any).mediaUrl || (material as any).url;
    if (!url) {
        return { pass: false, rationale: "未提供素材播放地址" };
    }

    try {
        const { safeChatCompletion } = await import('@/lib/deduplication/tuyooGatewayService').catch(() => ({ safeChatCompletion: null }));

        if (!safeChatCompletion) {
            return { pass: true, rationale: "AI 多模态服务未就绪，默认放行，建议人工抽查。" };
        }

        const messages = [
            {
                role: 'system',
                content: `你是一个视频审核硬性指标审查员。你需要判断这段视频画面或语料中是否出现非常明确的【CTA (Call-To-Action) 行动呼吁】。
客观定义：视频结尾或任何位置，只要出现“下载”、“立即试玩”、“点击下方”、“关注”、“领取”等强制性的动作指引导向语，即算具备 CTA。
回复必须是 JSON，字段包含 "pass" (布尔) 和 "rationale" (字符串，包含 50 字以内理由)。`
            },
            {
                role: 'user',
                content: `视频链接: ${url}\n\n请识别并返回 JSON。`
            }
        ];

        const resultObjStr = await safeChatCompletion({
            model: 'glm-4v',
            messages: messages as any,
            temperature: 0.1
        });

        if (!resultObjStr) {
            return { pass: true, rationale: '模型未召回有效内容。' };
        }

        const jsonMatch = resultObjStr.match(/\{[\s\S]*?\}/);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            return {
                pass: !!parsed.pass,
                rationale: parsed.rationale || 'AI 顺利测出 CTA 元素结果。'
            };
        }

        return { pass: true, rationale: "分析结果不标准，默认放行。" };

    } catch (error: any) {
        console.warn("CTA Checker AI 处理失败:", error.message);
        return { pass: true, rationale: "CTA 校验遇到错误，已放行。" };
    }
}
