/**
 * RAG 检索服务 — 知识上下文检索 + Prompt 注入
 *
 * 核心流程：
 * 1. 组合查询文本 → 生成 embedding
 * 2. RPC match_knowledge_entries 向量搜索
 * 3. 格式化为上下文字符串
 * 4. 注入到维度 prompt_template 的 {{context}} 占位符
 */
import { supabaseAdmin } from '@/lib/supabase/admin';
import { generateEmbedding } from '@/lib/vector-search';

// ==================== 类型 ====================

export interface RetrievedKnowledgeEntry {
    id: string;
    title: string;
    content: string;
    category: string;
    tags: string[] | null;
    similarity: number;
}

export interface KnowledgeContextResult {
    contextString: string;
    knowledgeIds: string[];
    entries: RetrievedKnowledgeEntry[];
}

// ==================== 核心函数 ====================

/**
 * 检索与给定维度 + 素材相关的知识上下文
 *
 * @param params.dimensionId - 维度 ID（排除维度本身）
 * @param params.dimensionTitle - 维度标题（用于组合查询）
 * @param params.materialName - 素材名称
 * @param params.materialType - 素材类型（可选）
 * @param params.teamId - 团队 ID（检索全局 + 团队知识）
 * @param params.topK - 返回条数（默认 5）
 * @param params.threshold - 相似度阈值（默认 0.4）
 */
export async function retrieveKnowledgeContext(params: {
    dimensionId: string;
    dimensionTitle: string;
    materialName: string;
    materialType?: string;
    teamId?: string;
    topK?: number;
    threshold?: number;
}): Promise<KnowledgeContextResult> {
    const {
        dimensionId,
        dimensionTitle,
        materialName,
        materialType,
        teamId,
        topK = 5,
        threshold = 0.4,
    } = params;

    const emptyResult: KnowledgeContextResult = {
        contextString: '暂无参考知识。',
        knowledgeIds: [],
        entries: [],
    };

    try {
        // 1. 组合查询文本
        const queryParts = [dimensionTitle, materialName];
        if (materialType) queryParts.push(materialType);
        const queryText = queryParts.join(' ');

        // 2. 生成查询 embedding
        const embedding = await generateEmbedding(queryText, 'RETRIEVAL_QUERY');
        if (!embedding || embedding.length === 0) {
            console.warn('[RAG] Embedding 生成失败，返回空上下文');
            return emptyResult;
        }

        // 3. RPC 向量搜索
        const { data, error } = await (supabaseAdmin as any).rpc('match_knowledge_entries', {
            query_embedding: JSON.stringify(embedding),
            match_threshold: threshold,
            match_count: topK + 5, // 多取几条，后面过滤
            filter_team_id: teamId ?? null,
            filter_category: null, // 搜索所有类别
        });

        if (error) {
            console.error('[RAG] 向量搜索失败:', error.message);
            return emptyResult;
        }

        if (!data || data.length === 0) {
            return emptyResult;
        }

        // 4. 过滤：排除维度条目自身，只保留 guideline/example/general
        const filtered = (data as RetrievedKnowledgeEntry[])
            .filter(entry =>
                entry.id !== dimensionId &&
                entry.category !== 'dimension'
            )
            .slice(0, topK);

        if (filtered.length === 0) {
            return emptyResult;
        }

        // 5. 格式化上下文
        const contextString = buildContextString(filtered);
        const knowledgeIds = filtered.map(e => e.id);

        return { contextString, knowledgeIds, entries: filtered };
    } catch (error: any) {
        console.error('[RAG] 检索上下文异常:', error.message);
        return emptyResult;
    }
}

/**
 * 将检索到的知识条目格式化为编号上下文字符串
 */
export function buildContextString(entries: RetrievedKnowledgeEntry[]): string {
    if (entries.length === 0) return '暂无参考知识。';

    return entries
        .map((entry, i) => {
            // 截取内容前 300 字，避免上下文过长
            const contentSnippet = entry.content.length > 300
                ? entry.content.substring(0, 300) + '...'
                : entry.content;
            return `[${i + 1}] ${entry.title}\n${contentSnippet}`;
        })
        .join('\n\n');
}

/**
 * 将 RAG 上下文注入到维度的 prompt_template
 * 替换 {{context}} 占位符
 */
export function buildDimensionPrompt(promptTemplate: string, context: string): string {
    if (!promptTemplate) return '';

    // 替换 {{context}} 占位符
    if (promptTemplate.includes('{{context}}')) {
        return promptTemplate.replace(/\{\{context\}\}/g, context);
    }

    // 如果模板中没有 {{context}} 占位符，追加到末尾
    return `${promptTemplate}\n\n参考知识：\n${context}`;
}
