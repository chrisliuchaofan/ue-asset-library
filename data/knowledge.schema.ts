/**
 * 知识库类型定义 — P4 知识驱动审核
 */

// ==================== 枚举 ====================

/** 知识条目类别 */
export type KnowledgeCategory = 'dimension' | 'guideline' | 'example' | 'general';

/** 维度检查方式 */
export type KnowledgeCheckType = 'rule_based' | 'ai_text' | 'ai_multimodal';

/** 知识条目状态 */
export type KnowledgeStatus = 'draft' | 'approved' | 'archived';

/** 知识来源类型 */
export type KnowledgeSourceType = 'manual' | 'feedback' | 'import' | 'interview';

// ==================== 标签映射 ====================

export const CATEGORY_LABELS: Record<KnowledgeCategory, string> = {
    dimension: '审核维度',
    guideline: '审核标准',
    example: '案例',
    general: '通用知识',
};

export const CHECK_TYPE_LABELS: Record<KnowledgeCheckType, string> = {
    rule_based: '规则判定',
    ai_text: 'AI 文本分析',
    ai_multimodal: 'AI 多模态分析',
};

export const STATUS_LABELS: Record<KnowledgeStatus, string> = {
    draft: '草稿',
    approved: '已启用',
    archived: '已归档',
};

export const SOURCE_TYPE_LABELS: Record<KnowledgeSourceType, string> = {
    manual: '手动创建',
    feedback: '反馈生成',
    import: '批量导入',
    interview: '访谈采集',
};

// ==================== 核心类型 ====================

/** 知识条目（前端类型，camelCase） */
export interface KnowledgeEntry {
    id: string;
    teamId: string | null;
    userId: string | null;

    // 内容
    title: string;
    content: string;
    category: KnowledgeCategory;
    tags: string[];

    // 维度专属字段（仅 category='dimension' 时有值）
    checkType?: KnowledgeCheckType;
    promptTemplate?: string;
    criteria?: Record<string, unknown>;
    applicableDimensions?: string[];

    // 来源追踪
    sourceType: KnowledgeSourceType;
    sourceMaterialId?: string;
    sourceReviewId?: string;

    // 状态
    status: KnowledgeStatus;

    // 时间戳
    createdAt: string;
    updatedAt: string;
}

/** 创建知识条目输入 */
export interface KnowledgeCreateInput {
    title: string;
    content: string;
    category: KnowledgeCategory;
    tags?: string[];

    // 维度专属
    checkType?: KnowledgeCheckType;
    promptTemplate?: string;
    criteria?: Record<string, unknown>;
    applicableDimensions?: string[];

    // 来源
    sourceType?: KnowledgeSourceType;
    sourceMaterialId?: string;
    sourceReviewId?: string;

    // 状态
    status?: KnowledgeStatus;
}

/** 更新知识条目输入 */
export interface KnowledgeUpdateInput {
    title?: string;
    content?: string;
    category?: KnowledgeCategory;
    tags?: string[];

    checkType?: KnowledgeCheckType;
    promptTemplate?: string;
    criteria?: Record<string, unknown>;
    applicableDimensions?: string[];

    sourceType?: KnowledgeSourceType;
    status?: KnowledgeStatus;
}

// ==================== 查询选项 ====================

export interface KnowledgeQueryOptions {
    category?: KnowledgeCategory;
    status?: KnowledgeStatus;
    sourceType?: KnowledgeSourceType;
    teamId?: string;
    limit?: number;
}
