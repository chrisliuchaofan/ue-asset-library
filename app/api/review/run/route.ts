import { NextResponse } from 'next/server';
import { getAllMaterials } from '@/lib/materials-data';
import { runMaterialReview, saveReviewRecord } from '@/lib/review/ai-orchestrator';
import { requireTeamAccess, isErrorResponse } from '@/lib/team/require-team';

export const maxDuration = 120; // 允许运行最多 2 分钟，因为包含 Gemini 多模态请求

export async function POST(req: Request) {
    try {
        const ctx = await requireTeamAccess('content:create');
        if (isErrorResponse(ctx)) return ctx;

        const { materialId } = await req.json();

        if (!materialId) {
            return NextResponse.json({ error: 'Missing materialId' }, { status: 400 });
        }

        const materials = await getAllMaterials();
        const material = materials.find((m: any) => m.id === materialId);

        if (!material) {
            return NextResponse.json({ error: 'Material not found' }, { status: 404 });
        }

        // 执行 AI 审查流程（传入 teamId 以支持动态维度 + RAG 检索）
        const reviewResult = await runMaterialReview(material, ctx.teamId);

        // 持久化至 Postgres
        const savedRecord = await saveReviewRecord(reviewResult);

        return NextResponse.json(savedRecord);

    } catch (error: any) {
        console.error('审查执行失败:', error);
        return NextResponse.json({ error: error.message || '内部服务错误' }, { status: 500 });
    }
}
