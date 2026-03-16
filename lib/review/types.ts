export type ReviewOverallStatus = 'pending' | 'passed' | 'failed' | 'pending_human';

export interface ObjectiveScore {
    pass: boolean;
    rationale: string;
}

export interface MaterialReview {
    id?: string;
    material_id: string;

    overall_status: ReviewOverallStatus;
    ai_rationale?: string;

    score_duration_pass?: boolean;
    score_duration_rationale?: string;

    score_hook_pass?: boolean;
    score_hook_rationale?: string;

    score_cta_pass?: boolean;
    score_cta_rationale?: string;

    human_reviewed_by?: string;
    human_override_status?: string;

    created_at?: Date | string;
    updated_at?: Date | string;
}

// 供 Orchestrator 使用的单维度返回结果
export interface DimensionCheckResult {
    pass: boolean;
    rationale: string;
}

// ==================== P4: 动态维度审核类型 ====================

/** 单个维度的动态审核结果（存入 JSONB） */
export interface DimensionResult {
    pass: boolean;
    rationale: string;
    /** 本次检查引用的知识条目 ID 列表（RAG 溯源） */
    knowledgeIds: string[];
}

/** 动态审核记录（扩展自 MaterialReview） */
export interface DynamicMaterialReview extends MaterialReview {
    /** 团队 ID */
    team_id?: string;
    /** 动态维度结果: dimensionId → DimensionResult */
    dimension_results: Record<string, DimensionResult>;
}

/** 维度检查器执行结果（包含元信息） */
export interface DynamicDimensionCheckResult {
    dimensionId: string;
    dimensionTitle: string;
    pass: boolean;
    rationale: string;
    knowledgeIds: string[];
}
