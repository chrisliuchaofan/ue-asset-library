/**
 * GET /api/knowledge/[id] — 获取单个知识条目
 * PATCH /api/knowledge/[id] — 更新知识条目
 * DELETE /api/knowledge/[id] — 删除知识条目
 */

import { NextResponse } from 'next/server';
import { requireTeamAccess, isErrorResponse } from '@/lib/team/require-team';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const ctx = await requireTeamAccess('content:read');
        if (isErrorResponse(ctx)) return ctx;

        const { id } = await params;
        const { dbGetKnowledgeEntryById } = await import('@/lib/knowledge/knowledge-db');
        const entry = await dbGetKnowledgeEntryById(id);

        if (!entry) {
            return NextResponse.json({ error: '知识条目不存在' }, { status: 404 });
        }

        return NextResponse.json(entry);
    } catch (error: any) {
        console.error('[KnowledgeAPI] 获取详情失败:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const ctx = await requireTeamAccess('content:create');
        if (isErrorResponse(ctx)) return ctx;

        const { id } = await params;
        const body = await request.json();

        const { dbUpdateKnowledgeEntry, dbStoreKnowledgeEmbedding } = await import(
            '@/lib/knowledge/knowledge-db'
        );

        const updated = await dbUpdateKnowledgeEntry(id, body);

        // 如果内容或标题变更，重新生成 embedding
        if (body.title !== undefined || body.content !== undefined) {
            regenerateEmbedding(id, updated.title, updated.content).catch(err =>
                console.error('[KnowledgeAPI] 重新生成 embedding 失败:', err.message)
            );
        }

        return NextResponse.json(updated);
    } catch (error: any) {
        console.error('[KnowledgeAPI] 更新失败:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const ctx = await requireTeamAccess('content:create');
        if (isErrorResponse(ctx)) return ctx;

        const { id } = await params;
        const { dbDeleteKnowledgeEntry } = await import('@/lib/knowledge/knowledge-db');
        await dbDeleteKnowledgeEntry(id);

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('[KnowledgeAPI] 删除失败:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

async function regenerateEmbedding(id: string, title: string, content: string) {
    const { generateEmbedding } = await import('@/lib/vector-search');
    const { dbStoreKnowledgeEmbedding } = await import('@/lib/knowledge/knowledge-db');

    const text = `${title}\n${content}`;
    const embedding = await generateEmbedding(text, 'RETRIEVAL_DOCUMENT');

    if (embedding && embedding.length > 0) {
        await dbStoreKnowledgeEmbedding(id, embedding);
    }
}
