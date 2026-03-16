import { NextResponse } from 'next/server';
import { z } from 'zod';
import { handleApiError } from '@/lib/error-handler';
import { getSession } from '@/lib/auth';
import { aiService } from '@/lib/ai/ai-service';
import { shouldCallRealAI, getUserModeInfo, createDryRunMockResponse } from '@/lib/ai/dry-run-check';
import { ErrorCode, createStandardError } from '@/lib/errors/error-handler';
import { consumeCredits } from '@/lib/credits';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

// 请求参数验证 Schema
const AnalysisSchema = z.object({
    prompt: z.string().min(1, '分析提示词不能为空'),
    systemPrompt: z.string().optional(),
    model: z.string().optional(),
});

export async function POST(request: Request) {
    try {
        // 检查登录状态
        const session = await getSession();
        if (!session?.user?.id && !session?.user?.email) {
            return NextResponse.json(
                { message: '未登录，请先登录' },
                { status: 401 }
            );
        }

        const body = await request.json();
        const parsed = AnalysisSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                { message: '参数验证失败', errors: parsed.error.flatten() },
                { status: 400 }
            );
        }

        const requestData = parsed.data;
        const userModeInfo = await getUserModeInfo();
        const shouldCallReal = await shouldCallRealAI();

        // Dry Run 模式
        if (!shouldCallReal) {
            const mockResult = createDryRunMockResponse<{ text: string }>(
                'ai_analysis',
                {
                    text: JSON.stringify({
                        summary: "【Dry Run 模式模拟数据】该视频主要通过强烈的视觉冲击结合痛点共鸣来吸引用户...",
                        hooks: ["前3秒黄金钩子：展示极具反差的画面", "痛点抛出：你还在用这种方法做素材吗？"],
                        structure: "抛出痛点 -> 提供解决方案 -> 案例展示 -> 转化引导",
                        suggestions: ["可以尝试加快前奏的节奏", "添加更有吸引力的BGM"]
                    })
                }
            );
            return NextResponse.json(mockResult, { status: 200 });
        }

        // 计费系统
        const estimatedCost = 2; // 给定拆解操作的固定积分消费
        const userId = session.user.id || session.user.email!;

        try {
            if (userModeInfo.balance < estimatedCost) {
                return NextResponse.json(
                    createStandardError(ErrorCode.INSUFFICIENT_CREDITS, `积分不足，当前余额: ${userModeInfo.balance}，需要: ${estimatedCost}`, { balance: userModeInfo.balance, required: estimatedCost }, 402),
                    { status: 402 }
                );
            }

            await consumeCredits(userId, {
                amount: estimatedCost,
                action: 'ai_analysis',
                refId: `analysis-${Date.now()}-${Math.random().toString(36).substring(7)}`,
                description: `爆款拆解分析`,
            });
        } catch (billingError: any) {
            console.error('[AI Analysis] 积分扣除失败:', billingError);
            return NextResponse.json(
                { message: '积分扣除失败', error: billingError.message || '无法完成积分扣除，请稍后重试' },
                { status: 500 }
            );
        }

        // 使用 tuyoo provider（调用太石网关）
        try {
            const result = await aiService.generateText({
                prompt: requestData.prompt,
                systemPrompt: requestData.systemPrompt,
                model: requestData.model,
                responseFormat: 'json',
            }, 'tuyoo');

            return NextResponse.json(result);
        } catch (error) {
            console.error('[AI Analysis] AI 服务调用失败:', error);
            const errorMessage = error instanceof Error ? error.message : 'AI 服务调用失败';
            return NextResponse.json(
                { message: 'AI 服务调度失败', error: errorMessage },
                { status: 500 }
            );
        }
    } catch (error) {
        console.error('[AI Analysis] 最终错误:', error);
        return handleApiError(error, '分析生成失败');
    }
}
