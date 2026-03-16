/**
 * 知识库 DB 服务层 — CRUD + embedding 存储 + 维度查询
 *
 * 遵循 templates-db.ts 相同模式：supabaseAdmin + as any cast + row mapper
 */
import { supabaseAdmin } from '@/lib/supabase/admin';
import type {
    KnowledgeEntry,
    KnowledgeCreateInput,
    KnowledgeUpdateInput,
    KnowledgeQueryOptions,
    KnowledgeCategory,
    KnowledgeCheckType,
    KnowledgeStatus,
    KnowledgeSourceType,
} from '@/data/knowledge.schema';

// ==================== DB Row 类型 ====================

interface KnowledgeRow {
    id: string;
    team_id: string | null;
    user_id: string | null;
    title: string;
    content: string;
    category: string;
    tags: string[] | null;
    check_type: string | null;
    prompt_template: string | null;
    criteria: Record<string, unknown> | null;
    applicable_dimensions: string[] | null;
    source_type: string;
    source_material_id: string | null;
    source_review_id: string | null;
    status: string;
    embedding: string | null;
    created_at: string;
    updated_at: string;
}

// ==================== Row <-> FE 映射 ====================

function rowToKnowledgeEntry(row: KnowledgeRow): KnowledgeEntry {
    return {
        id: row.id,
        teamId: row.team_id,
        userId: row.user_id,
        title: row.title,
        content: row.content,
        category: row.category as KnowledgeCategory,
        tags: row.tags ?? [],
        checkType: (row.check_type as KnowledgeCheckType) ?? undefined,
        promptTemplate: row.prompt_template ?? undefined,
        criteria: row.criteria ?? undefined,
        applicableDimensions: row.applicable_dimensions ?? undefined,
        sourceType: row.source_type as KnowledgeSourceType,
        sourceMaterialId: row.source_material_id ?? undefined,
        sourceReviewId: row.source_review_id ?? undefined,
        status: row.status as KnowledgeStatus,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

// ==================== 查询 ====================

/**
 * 获取知识条目列表（支持多条件过滤）
 */
export async function dbGetKnowledgeEntries(
    options?: KnowledgeQueryOptions
): Promise<KnowledgeEntry[]> {
    const supabase = supabaseAdmin;

    let query = supabase
        .from('knowledge_entries')
        .select('*')
        .order('created_at', { ascending: false });

    if (options?.category) {
        query = query.eq('category', options.category);
    }
    if (options?.status) {
        query = query.eq('status', options.status);
    }
    if (options?.sourceType) {
        query = query.eq('source_type', options.sourceType);
    }
    if (options?.teamId) {
        // 获取全局（team_id IS NULL）+ 指定团队的条目
        query = query.or(`team_id.is.null,team_id.eq.${options.teamId}`);
    }
    if (options?.limit) {
        query = query.limit(options.limit);
    }

    const { data, error } = await query;

    if (error) {
        throw new Error(`查询知识条目失败: ${error.message}`);
    }

    return (data as unknown as KnowledgeRow[]).map(rowToKnowledgeEntry);
}

/**
 * 获取单个知识条目
 */
export async function dbGetKnowledgeEntryById(id: string): Promise<KnowledgeEntry | null> {
    const supabase = supabaseAdmin;

    const { data, error } = await supabase
        .from('knowledge_entries')
        .select('*')
        .eq('id', id)
        .single();

    if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw new Error(`查询知识条目失败: ${error.message}`);
    }

    return rowToKnowledgeEntry(data as unknown as KnowledgeRow);
}

/**
 * 获取已启用的审核维度（全局 + 指定团队）
 * 便捷函数，供审核引擎使用
 */
export async function dbGetDimensions(teamId?: string): Promise<KnowledgeEntry[]> {
    const supabase = supabaseAdmin;

    let query = supabase
        .from('knowledge_entries')
        .select('*')
        .eq('category', 'dimension')
        .eq('status', 'approved')
        .order('created_at', { ascending: true });

    if (teamId) {
        query = query.or(`team_id.is.null,team_id.eq.${teamId}`);
    } else {
        query = query.is('team_id', null);
    }

    const { data, error } = await query;

    if (error) {
        console.error('[Knowledge] 获取审核维度失败:', error.message);
        return [];
    }

    return (data as unknown as KnowledgeRow[]).map(rowToKnowledgeEntry);
}

// ==================== 创建 ====================

/**
 * 创建知识条目
 */
export async function dbCreateKnowledgeEntry(
    input: KnowledgeCreateInput,
    options?: { teamId?: string; userId?: string }
): Promise<KnowledgeEntry> {
    const supabase = supabaseAdmin;

    const insertData: Record<string, unknown> = {
        title: input.title,
        content: input.content,
        category: input.category,
        source_type: input.sourceType || 'manual',
        status: input.status || 'draft',
    };

    // 可选字段
    if (input.tags && input.tags.length > 0) insertData.tags = input.tags;
    if (input.checkType) insertData.check_type = input.checkType;
    if (input.promptTemplate) insertData.prompt_template = input.promptTemplate;
    if (input.criteria) insertData.criteria = input.criteria;
    if (input.applicableDimensions && input.applicableDimensions.length > 0) {
        insertData.applicable_dimensions = input.applicableDimensions;
    }
    if (input.sourceMaterialId) insertData.source_material_id = input.sourceMaterialId;
    if (input.sourceReviewId) insertData.source_review_id = input.sourceReviewId;

    // 上下文参数
    if (options?.teamId) insertData.team_id = options.teamId;
    if (options?.userId) insertData.user_id = options.userId;

    const { data, error } = await (supabase
        .from('knowledge_entries') as any)
        .insert(insertData)
        .select()
        .single();

    if (error) {
        throw new Error(`创建知识条目失败: ${error.message}`);
    }

    return rowToKnowledgeEntry(data as KnowledgeRow);
}

// ==================== 更新 ====================

/**
 * 更新知识条目
 */
export async function dbUpdateKnowledgeEntry(
    id: string,
    updates: KnowledgeUpdateInput
): Promise<KnowledgeEntry> {
    const supabase = supabaseAdmin;

    const updateData: Record<string, unknown> = {};

    if (updates.title !== undefined) updateData.title = updates.title;
    if (updates.content !== undefined) updateData.content = updates.content;
    if (updates.category !== undefined) updateData.category = updates.category;
    if (updates.tags !== undefined) updateData.tags = updates.tags;
    if (updates.checkType !== undefined) updateData.check_type = updates.checkType;
    if (updates.promptTemplate !== undefined) updateData.prompt_template = updates.promptTemplate;
    if (updates.criteria !== undefined) updateData.criteria = updates.criteria;
    if (updates.applicableDimensions !== undefined) {
        updateData.applicable_dimensions = updates.applicableDimensions;
    }
    if (updates.sourceType !== undefined) updateData.source_type = updates.sourceType;
    if (updates.status !== undefined) updateData.status = updates.status;

    const { data, error } = await (supabase
        .from('knowledge_entries') as any)
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

    if (error) {
        throw new Error(`更新知识条目失败: ${error.message}`);
    }

    return rowToKnowledgeEntry(data as KnowledgeRow);
}

// ==================== 删除 ====================

/**
 * 删除知识条目
 */
export async function dbDeleteKnowledgeEntry(id: string): Promise<void> {
    const supabase = supabaseAdmin;

    const { error } = await supabase
        .from('knowledge_entries')
        .delete()
        .eq('id', id);

    if (error) {
        throw new Error(`删除知识条目失败: ${error.message}`);
    }
}

// ==================== 向量存储 ====================

/**
 * 为知识条目存储 embedding 向量
 */
export async function dbStoreKnowledgeEmbedding(
    id: string,
    embedding: number[]
): Promise<boolean> {
    const supabase = supabaseAdmin;

    const { error } = await (supabase
        .from('knowledge_entries') as any)
        .update({ embedding: JSON.stringify(embedding) })
        .eq('id', id);

    if (error) {
        console.error(`[Knowledge] 存储 embedding 失败 (${id}):`, error.message);
        return false;
    }

    return true;
}

// ==================== 反馈候选 ====================

/**
 * 从人工覆盖自动创建反馈候选（draft 状态）
 * 当人工覆盖某个维度的审核结果时，自动生成一条知识候选条目
 */
export async function dbCreateFeedbackCandidate(params: {
    materialId: string;
    reviewId: string;
    dimensionId: string;
    dimensionTitle: string;
    originalPass: boolean;
    humanPass: boolean;
    rationale: string;
    userId: string;
    teamId?: string;
}): Promise<KnowledgeEntry> {
    const { materialId, reviewId, dimensionId, dimensionTitle, originalPass, humanPass, rationale, userId, teamId } = params;

    const action = humanPass ? '应该通过' : '不应通过';
    const aiAction = originalPass ? '通过' : '拦截';

    const content = `## 反馈来源

- **素材 ID**: ${materialId}
- **审核维度**: ${dimensionTitle}
- **AI 原始判定**: ${aiAction}
- **人工修正**: ${action}

## 修正理由

${rationale}

## 建议规则

基于此反馈，建议在"${dimensionTitle}"维度的审核标准中增加以下考量：
- ${rationale}`;

    return dbCreateKnowledgeEntry(
        {
            title: `[反馈] ${dimensionTitle} — ${action}`,
            content,
            category: 'guideline',
            tags: ['feedback', dimensionId],
            applicableDimensions: [dimensionId],
            sourceType: 'feedback',
            sourceMaterialId: materialId,
            sourceReviewId: reviewId,
            status: 'draft',
        },
        { teamId, userId }
    );
}
