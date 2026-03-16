/**
 * GET /api/knowledge/feedback — 获取反馈候选列表
 * POST /api/knowledge/feedback — 审批反馈候选（approve/archive）
 */

import { NextResponse } from 'next/server';
import { requireTeamAccess, isErrorResponse } from '@/lib/team/require-team';

export async function GET(request: Request) {
    try {
        const ctx = await requireTeamAccess('content:read');
        if (isErrorResponse(ctx)) return ctx;

        const { dbGetKnowledgeEntries } = await import('@/lib/knowledge/knowledge-db');

        // 反馈候选 = sourceType='feedback', 通常 status='draft'
        const entries = await dbGetKnowledgeEntries({
            sourceType: 'feedback',
            teamId: ctx.teamId,
        });

        return NextResponse.json({ entries });
    } catch (error: any) {
        console.error('[KnowledgeFeedback] 获取反馈列表失败:', error);
        return NextResponse.json({ entries: [], error: error.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const ctx = await requireTeamAccess('content:create');
        if (isErrorResponse(ctx)) return ctx;

        const body = await request.json();
        const { id, action } = body as { id: string; action: 'approve' | 'archive' };

        if (!id || !action) {
            return NextResponse.json(
                { error: '缺少必填字段: id, action' },
                { status: 400 }
            );
        }

        if (action !== 'approve' && action !== 'archive') {
            return NextResponse.json(
                { error: 'action 必须是 approve 或 archive' },
                { status: 400 }
            );
        }

        const { dbUpdateKnowledgeEntry, dbStoreKnowledgeEmbedding } = await import(
            '@/lib/knowledge/knowledge-db'
        );

        const newStatus = action === 'approve' ? 'approved' : 'archived';
        const updated = await dbUpdateKnowledgeEntry(id, { status: newStatus as any });

        // 如果审批通过，为其生成 embedding 以便 RAG 检索
        if (action === 'approve') {
            const { generateEmbedding } = await import('@/lib/vector-search');
            const text = `${updated.title}\n${updated.content}`;
            generateEmbedding(text, 'RETRIEVAL_DOCUMENT')
                .then(embedding => {
                    if (embedding && embedding.length > 0) {
                        dbStoreKnowledgeEmbedding(id, embedding);
                    }
                })
                .catch(err =>
                    console.error(`[KnowledgeFeedback] Embedding 失败 (${id}):`, err.message)
                );
        }

        return NextResponse.json(updated);
    } catch (error: any) {
        console.error('[KnowledgeFeedback] 审批失败:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
