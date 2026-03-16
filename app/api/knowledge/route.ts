/**
 * GET /api/knowledge — 获取知识条目列表
 * POST /api/knowledge — 创建知识条目（+ 异步生成 embedding）
 */

import { NextResponse } from 'next/server';
import { requireTeamAccess, isErrorResponse } from '@/lib/team/require-team';

export async function GET(request: Request) {
    try {
        const ctx = await requireTeamAccess('content:read');
        if (isErrorResponse(ctx)) return ctx;

        const { searchParams } = new URL(request.url);
        const category = searchParams.get('category') || undefined;
        const status = searchParams.get('status') || undefined;
        const sourceType = searchParams.get('sourceType') || undefined;
        const limit = searchParams.get('limit') ? Number(searchParams.get('limit')) : undefined;

        const { dbGetKnowledgeEntries } = await import('@/lib/knowledge/knowledge-db');
        const entries = await dbGetKnowledgeEntries({
            category: category as any,
            status: status as any,
            sourceType: sourceType as any,
            teamId: ctx.teamId,
            limit,
        });

        return NextResponse.json({ entries });
    } catch (error: any) {
        console.error('[KnowledgeAPI] 获取列表失败:', error);
        return NextResponse.json({ entries: [], error: error.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const ctx = await requireTeamAccess('content:create');
        if (isErrorResponse(ctx)) return ctx;

        const body = await request.json();

        if (!body.title || !body.content || !body.category) {
            return NextResponse.json(
                { error: '缺少必填字段: title, content, category' },
                { status: 400 }
            );
        }

        const { dbCreateKnowledgeEntry, dbStoreKnowledgeEmbedding } = await import(
            '@/lib/knowledge/knowledge-db'
        );

        // 创建条目
        const entry = await dbCreateKnowledgeEntry(body, {
            teamId: ctx.teamId,
            userId: ctx.userId,
        });

        // 异步生成 embedding（不阻塞响应）
        generateAndStoreEmbedding(entry.id, entry.title, entry.content).catch(err =>
            console.error('[KnowledgeAPI] 异步 embedding 失败:', err.message)
        );

        return NextResponse.json(entry, { status: 201 });
    } catch (error: any) {
        console.error('[KnowledgeAPI] 创建失败:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

/**
 * 异步生成并存储 embedding
 */
async function generateAndStoreEmbedding(id: string, title: string, content: string) {
    const { generateEmbedding } = await import('@/lib/vector-search');
    const { dbStoreKnowledgeEmbedding } = await import('@/lib/knowledge/knowledge-db');

    const text = `${title}\n${content}`;
    const embedding = await generateEmbedding(text, 'RETRIEVAL_DOCUMENT');

    if (embedding && embedding.length > 0) {
        await dbStoreKnowledgeEmbedding(id, embedding);
        console.log(`[KnowledgeAPI] Embedding 生成成功: ${id}`);
    } else {
        console.warn(`[KnowledgeAPI] Embedding 生成失败或为零向量: ${id}`);
    }
}
