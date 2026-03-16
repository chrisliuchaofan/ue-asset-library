/**
 * POST /api/review/override — 覆盖单维度审核结果 + 自动生成反馈候选
 */

import { NextResponse } from 'next/server';
import { requireTeamAccess, isErrorResponse } from '@/lib/team/require-team';

export async function POST(request: Request) {
    try {
        const ctx = await requireTeamAccess('content:create');
        if (isErrorResponse(ctx)) return ctx;

        const body = await request.json();
        const { materialId, dimensionId, dimensionTitle, newPass, rationale } = body;

        if (!materialId || !dimensionId || !dimensionTitle || newPass === undefined || !rationale) {
            return NextResponse.json(
                { error: '缺少必填字段: materialId, dimensionId, dimensionTitle, newPass, rationale' },
                { status: 400 }
            );
        }

        const { overrideDimensionResult } = await import('@/lib/review/ai-orchestrator');

        await overrideDimensionResult({
            materialId,
            dimensionId,
            dimensionTitle,
            newPass: !!newPass,
            rationale,
            userId: ctx.userId,
            teamId: ctx.teamId,
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('[ReviewOverride] 覆盖维度结果失败:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
