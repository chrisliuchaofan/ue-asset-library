/**
 * POST /api/knowledge/import — Markdown 批量导入
 *
 * 按 `## ` 分块，每块创建一条知识条目
 */

import { NextResponse } from 'next/server';
import { requireTeamAccess, isErrorResponse } from '@/lib/team/require-team';
import type { KnowledgeCategory } from '@/data/knowledge.schema';

export async function POST(request: Request) {
    try {
        const ctx = await requireTeamAccess('content:create');
        if (isErrorResponse(ctx)) return ctx;

        const body = await request.json();
        const { markdown, category, tags, status } = body as {
            markdown: string;
            category: KnowledgeCategory;
            tags?: string[];
            status?: string;
        };

        if (!markdown || !category) {
            return NextResponse.json(
                { error: '缺少必填字段: markdown, category' },
                { status: 400 }
            );
        }

        // 按 ## 标题分块
        const chunks = parseMarkdownChunks(markdown);

        if (chunks.length === 0) {
            return NextResponse.json(
                { error: '未能从 Markdown 中解析出有效的分块（需要 ## 标题）' },
                { status: 400 }
            );
        }

        const { dbCreateKnowledgeEntry, dbStoreKnowledgeEmbedding } = await import(
            '@/lib/knowledge/knowledge-db'
        );
        const { generateEmbedding } = await import('@/lib/vector-search');

        const results: { id: string; title: string; success: boolean; error?: string }[] = [];

        for (const chunk of chunks) {
            try {
                const entry = await dbCreateKnowledgeEntry(
                    {
                        title: chunk.title,
                        content: chunk.content,
                        category,
                        tags: tags || [],
                        sourceType: 'import',
                        status: (status as any) || 'draft',
                    },
                    { teamId: ctx.teamId, userId: ctx.userId }
                );

                results.push({ id: entry.id, title: entry.title, success: true });

                // 异步生成 embedding（不阻塞循环）
                const text = `${chunk.title}\n${chunk.content}`;
                generateEmbedding(text, 'RETRIEVAL_DOCUMENT')
                    .then(embedding => {
                        if (embedding && embedding.length > 0) {
                            dbStoreKnowledgeEmbedding(entry.id, embedding);
                        }
                    })
                    .catch(err =>
                        console.error(`[KnowledgeImport] Embedding 失败 (${entry.id}):`, err.message)
                    );
            } catch (err: any) {
                results.push({ id: '', title: chunk.title, success: false, error: err.message });
            }
        }

        const successCount = results.filter(r => r.success).length;

        return NextResponse.json({
            total: chunks.length,
            success: successCount,
            failed: chunks.length - successCount,
            results,
        });
    } catch (error: any) {
        console.error('[KnowledgeImport] 导入失败:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

/**
 * 将 Markdown 按 `## ` 分割为多个块
 * 每个块的标题取自 `## ` 行，内容取后续段落
 */
function parseMarkdownChunks(markdown: string): { title: string; content: string }[] {
    const chunks: { title: string; content: string }[] = [];
    const lines = markdown.split('\n');

    let currentTitle = '';
    let currentLines: string[] = [];

    for (const line of lines) {
        if (line.startsWith('## ')) {
            // 保存上一个块
            if (currentTitle) {
                chunks.push({
                    title: currentTitle,
                    content: currentLines.join('\n').trim(),
                });
            }
            currentTitle = line.replace(/^## /, '').trim();
            currentLines = [];
        } else {
            currentLines.push(line);
        }
    }

    // 保存最后一个块
    if (currentTitle) {
        chunks.push({
            title: currentTitle,
            content: currentLines.join('\n').trim(),
        });
    }

    // 过滤空内容
    return chunks.filter(c => c.content.length > 0);
}
