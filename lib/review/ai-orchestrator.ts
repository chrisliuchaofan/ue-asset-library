/**
 * AI 审核调度器 — P4 动态维度版本
 *
 * 核心变化：
 * - 维度从硬编码 3 个升级为知识库动态获取
 * - 单维度检查统一走 dynamic-checker 工厂
 * - 结果存入 dimension_results JSONB
 * - 保留旧列兼容（score_xxx），过渡期同时写入
 */
import { supabaseAdmin } from '@/lib/supabase/admin';
import { Material } from '@/data/material.schema';
import {
    MaterialReview,
    ReviewOverallStatus,
    DynamicMaterialReview,
    DimensionResult,
} from './types';
import { dbGetDimensions } from '@/lib/knowledge/knowledge-db';
import { executeDimensionCheck } from './dynamic-checker';

// ==================== 旧 checker（兼容降级用） ====================

import { checkDuration } from './duration-checker';
import { checkHook } from './hook-checker';
import { checkCTA } from './cta-checker';

// ==================== 核心调度 ====================

/**
 * 对单个素材执行动态维度审核
 *
 * @param material - 待审核素材
 * @param teamId - 团队 ID（可选，用于获取团队专属维度 + RAG 检索）
 */
export async function runMaterialReview(
    material: Material,
    teamId?: string
): Promise<DynamicMaterialReview> {
    // 1. 从知识库获取已启用的审核维度
    let dimensions = await dbGetDimensions(teamId);

    // 2. 如果知识库无维度（比如 SQL 未执行），降级到旧逻辑
    if (!dimensions || dimensions.length === 0) {
        console.warn('[Orchestrator] 未获取到动态维度，降级到硬编码检查');
        return runLegacyReview(material);
    }

    // 2.5 按 priority 排序，合规维度优先（priority 小的在前）
    dimensions.sort((a, b) => {
        const pa = (a as any).criteria?.priority ?? 999;
        const pb = (b as any).criteria?.priority ?? 999;
        return pa - pb;
    });

    // 3. 并行执行所有维度检查
    const checkResults = await Promise.all(
        dimensions.map(dim =>
            executeDimensionCheck({ dimension: dim, material, teamId })
        )
    );

    // 4. 聚合维度结果
    const dimensionResults: Record<string, DimensionResult> = {};
    const failureReasons: string[] = [];
    let allPassed = true;

    for (const cr of checkResults) {
        dimensionResults[cr.dimensionId] = {
            pass: cr.pass,
            rationale: cr.rationale,
            knowledgeIds: cr.knowledgeIds,
        };
        if (!cr.pass) {
            allPassed = false;
            failureReasons.push(`[${cr.dimensionTitle}] ${cr.rationale}`);
        }
    }

    const overallStatus: ReviewOverallStatus = allPassed ? 'passed' : 'failed';

    const aiRationale = allPassed
        ? `全部 ${checkResults.length} 个审核维度均达标。`
        : `素材有 ${failureReasons.length} 项考核未达标：${failureReasons.join(' ')}`;

    // 5. 兼容旧列 — 从维度结果中提取 3 个旧维度的值（如果存在）
    const durationResult = dimensionResults['dim-duration'];
    const hookResult = dimensionResults['dim-hook'];
    const ctaResult = dimensionResults['dim-cta'];

    const review: DynamicMaterialReview = {
        material_id: material.id,
        overall_status: overallStatus,
        ai_rationale: aiRationale,
        team_id: teamId,
        dimension_results: dimensionResults,

        // 旧列兼容
        score_duration_pass: durationResult?.pass,
        score_duration_rationale: durationResult?.rationale,
        score_hook_pass: hookResult?.pass,
        score_hook_rationale: hookResult?.rationale,
        score_cta_pass: ctaResult?.pass,
        score_cta_rationale: ctaResult?.rationale,
    };

    return review;
}

/**
 * 降级到旧版硬编码 3 维度检查
 * 当知识库未就绪时使用
 */
async function runLegacyReview(material: Material): Promise<DynamicMaterialReview> {
    const [durationResult, hookResult, ctaResult] = await Promise.all([
        checkDuration(material),
        checkHook(material),
        checkCTA(material),
    ]);

    const isAllPassed = durationResult.pass && hookResult.pass && ctaResult.pass;
    const overallStatus: ReviewOverallStatus = isAllPassed ? 'passed' : 'failed';

    const failureReasons = [];
    if (!durationResult.pass) failureReasons.push(durationResult.rationale);
    if (!hookResult.pass) failureReasons.push(hookResult.rationale);
    if (!ctaResult.pass) failureReasons.push(ctaResult.rationale);

    const aiRationale = isAllPassed
        ? '三个硬性客观考核指标（时长、前3秒钩子、CTA明确性）全部达标。'
        : `素材有 ${failureReasons.length} 项考核未达标：${failureReasons.join(' ')}`;

    const dimensionResults: Record<string, DimensionResult> = {
        'dim-duration': { pass: durationResult.pass, rationale: durationResult.rationale, knowledgeIds: [] },
        'dim-hook': { pass: hookResult.pass, rationale: hookResult.rationale, knowledgeIds: [] },
        'dim-cta': { pass: ctaResult.pass, rationale: ctaResult.rationale, knowledgeIds: [] },
    };

    return {
        material_id: material.id,
        overall_status: overallStatus,
        ai_rationale: aiRationale,
        dimension_results: dimensionResults,
        score_duration_pass: durationResult.pass,
        score_duration_rationale: durationResult.rationale,
        score_hook_pass: hookResult.pass,
        score_hook_rationale: hookResult.rationale,
        score_cta_pass: ctaResult.pass,
        score_cta_rationale: ctaResult.rationale,
    };
}

// ==================== 数据库操作 ====================

/**
 * 将审核结果存入 Supabase Database
 * 同时写入 dimension_results JSONB + 旧列兼容
 */
export async function saveReviewRecord(review: DynamicMaterialReview): Promise<DynamicMaterialReview> {
    const supabase = supabaseAdmin as any;

    // 构建写入数据
    const writeData: Record<string, unknown> = {
        material_id: review.material_id,
        overall_status: review.overall_status,
        ai_rationale: review.ai_rationale,
        dimension_results: review.dimension_results,
        // 旧列兼容
        score_duration_pass: review.score_duration_pass,
        score_duration_rationale: review.score_duration_rationale,
        score_hook_pass: review.score_hook_pass,
        score_hook_rationale: review.score_hook_rationale,
        score_cta_pass: review.score_cta_pass,
        score_cta_rationale: review.score_cta_rationale,
    };

    // 可选字段
    if (review.team_id) writeData.team_id = review.team_id;

    // 查询是否已存在该 material_id 的审核记录
    const { data: existing } = await supabase
        .from('material_reviews')
        .select('id')
        .eq('material_id', review.material_id)
        .single();

    if (existing) {
        // Update
        const { data, error } = await supabase
            .from('material_reviews')
            .update({
                ...writeData,
                updated_at: new Date().toISOString(),
            })
            .eq('id', existing.id)
            .select()
            .single();

        if (error) throw new Error(`更新审查记录失败: ${error.message}`);
        return data;
    } else {
        // Insert
        const { data, error } = await supabase
            .from('material_reviews')
            .insert(writeData)
            .select()
            .single();

        if (error) throw new Error(`创建审查记录失败: ${error.message}`);
        return data;
    }
}

/**
 * 获取某个素材的审核记录
 */
export async function getReviewRecord(materialId: string): Promise<DynamicMaterialReview | null> {
    const supabase = supabaseAdmin as any;
    const { data, error } = await supabase
        .from('material_reviews')
        .select('*')
        .eq('material_id', materialId)
        .single();

    if (error) {
        if (error.code === 'PGRST116') return null; // NotFound
        console.error('获取审查记录失败', error);
        return null;
    }

    // 确保 dimension_results 有值
    if (data && !data.dimension_results) {
        data.dimension_results = {};
    }

    return data;
}

/**
 * 覆盖整体审核状态（旧接口，保持兼容）
 */
export async function overrideReviewStatus(
    materialId: string,
    status: ReviewOverallStatus,
    userId: string
): Promise<void> {
    const supabase = supabaseAdmin as any;
    const { error } = await supabase
        .from('material_reviews')
        .update({
            overall_status: status,
            human_override_status: status,
            human_reviewed_by: userId,
            updated_at: new Date().toISOString(),
        })
        .eq('material_id', materialId);

    if (error) throw new Error(`人工覆盖失败: ${error.message}`);
}

/**
 * 覆盖单个维度的审核结果 + 自动生成反馈候选
 *
 * @param materialId - 素材 ID
 * @param dimensionId - 维度 ID
 * @param dimensionTitle - 维度标题
 * @param newPass - 人工修正后的判定
 * @param rationale - 修正理由
 * @param userId - 操作用户
 * @param teamId - 团队 ID
 */
export async function overrideDimensionResult(params: {
    materialId: string;
    dimensionId: string;
    dimensionTitle: string;
    newPass: boolean;
    rationale: string;
    userId: string;
    teamId?: string;
}): Promise<void> {
    const { materialId, dimensionId, dimensionTitle, newPass, rationale, userId, teamId } = params;
    const supabase = supabaseAdmin as any;

    // 1. 获取当前审核记录
    const { data: review, error: fetchError } = await supabase
        .from('material_reviews')
        .select('*')
        .eq('material_id', materialId)
        .single();

    if (fetchError || !review) {
        throw new Error(`找不到素材审核记录: ${fetchError?.message || '记录不存在'}`);
    }

    // 2. 更新 dimension_results JSONB 中指定维度的结果
    const dimensionResults = review.dimension_results || {};
    const originalPass = dimensionResults[dimensionId]?.pass;

    dimensionResults[dimensionId] = {
        pass: newPass,
        rationale: `[人工修正] ${rationale}`,
        knowledgeIds: dimensionResults[dimensionId]?.knowledgeIds || [],
    };

    // 3. 重新计算 overall_status
    const allPassed = Object.values(dimensionResults).every((r: any) => r.pass);
    const newOverallStatus: ReviewOverallStatus = allPassed ? 'passed' : 'failed';

    // 4. 更新数据库
    const { error: updateError } = await supabase
        .from('material_reviews')
        .update({
            dimension_results: dimensionResults,
            overall_status: newOverallStatus,
            human_override_status: newOverallStatus,
            human_reviewed_by: userId,
            updated_at: new Date().toISOString(),
        })
        .eq('material_id', materialId);

    if (updateError) {
        throw new Error(`覆盖维度结果失败: ${updateError.message}`);
    }

    // 5. 自动生成反馈候选（仅当判定结果与原始不同时）
    if (originalPass !== undefined && originalPass !== newPass) {
        try {
            const { dbCreateFeedbackCandidate } = await import('@/lib/knowledge/knowledge-db');
            await dbCreateFeedbackCandidate({
                materialId,
                reviewId: review.id,
                dimensionId,
                dimensionTitle,
                originalPass,
                humanPass: newPass,
                rationale,
                userId,
                teamId,
            });
            console.log(`[Orchestrator] 已为维度 "${dimensionTitle}" 生成反馈候选`);
        } catch (e: any) {
            // 反馈候选生成失败不影响主流程
            console.error('[Orchestrator] 反馈候选生成失败:', e.message);
        }
    }
}
