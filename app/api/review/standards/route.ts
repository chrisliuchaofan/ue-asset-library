import { NextResponse } from 'next/server';
import { requireTeamAccess, isErrorResponse } from '@/lib/team/require-team';
import {
    DEFAULT_REVIEW_STANDARDS,
    REVIEW_STANDARDS_TAG,
    normalizeReviewStandards,
} from '@/data/review-standards.schema';
import type { KnowledgeEntry } from '@/data/knowledge.schema';

function findStandardsEntry(entries: KnowledgeEntry[], teamId?: string) {
    const tagged = entries.filter(entry => entry.tags?.includes(REVIEW_STANDARDS_TAG));
    return tagged.find(entry => entry.teamId === teamId) || tagged[0] || null;
}

function standardsContent() {
    return [
        '用于审核中心三评委人工评分的配置。',
        '',
        '包含通用评分项、三位负责人各自评分维度、四档结论标准和通过线。',
        '请通过设置页编辑，不建议手动修改本条知识内容。',
    ].join('\n');
}

export async function GET() {
    try {
        const ctx = await requireTeamAccess('content:read');
        if (isErrorResponse(ctx)) return ctx;

        const { dbGetKnowledgeEntries } = await import('@/lib/knowledge/knowledge-db');
        const entries = await dbGetKnowledgeEntries({
            category: 'guideline',
            teamId: ctx.teamId,
            limit: 200,
        });
        const entry = findStandardsEntry(entries, ctx.teamId);
        const standards = normalizeReviewStandards((entry?.criteria as any) || DEFAULT_REVIEW_STANDARDS);

        return NextResponse.json({
            standards,
            source: entry ? 'saved' : 'default',
            entryId: entry?.id || null,
        });
    } catch (error: any) {
        console.error('[ReviewStandardsAPI] 获取审核标准失败:', error);
        return NextResponse.json(
            { standards: DEFAULT_REVIEW_STANDARDS, source: 'default', error: error.message },
            { status: 500 }
        );
    }
}

export async function PUT(request: Request) {
    try {
        const ctx = await requireTeamAccess('content:create');
        if (isErrorResponse(ctx)) return ctx;

        const body = await request.json();
        const standards = normalizeReviewStandards(body?.standards || body);

        const { dbCreateKnowledgeEntry, dbGetKnowledgeEntries, dbUpdateKnowledgeEntry } = await import('@/lib/knowledge/knowledge-db');
        const entries = await dbGetKnowledgeEntries({
            category: 'guideline',
            teamId: ctx.teamId,
            limit: 200,
        });
        const existing = findStandardsEntry(
            entries.filter(entry => entry.teamId === ctx.teamId),
            ctx.teamId
        );

        const payload = {
            title: '审核中心人工评分标准',
            content: standardsContent(),
            category: 'guideline' as const,
            tags: [REVIEW_STANDARDS_TAG, 'review', 'manual-score'],
            criteria: standards as any,
            sourceType: 'manual' as const,
            status: 'approved' as const,
        };

        const entry = existing
            ? await dbUpdateKnowledgeEntry(existing.id, payload)
            : await dbCreateKnowledgeEntry(payload, { teamId: ctx.teamId, userId: ctx.userId });

        return NextResponse.json({ standards, entry });
    } catch (error: any) {
        console.error('[ReviewStandardsAPI] 保存审核标准失败:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
