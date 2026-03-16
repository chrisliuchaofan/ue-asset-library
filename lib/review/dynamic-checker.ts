/**
 * 动态维度检查器工厂 — 根据 check_type 分派不同的审核策略
 *
 * 支持 3 种 check_type:
 * - rule_based: 从 criteria JSON 读取规则，纯逻辑判定（如时长 min/max）
 * - ai_text: DeepSeek 文本分析 + RAG 上下文
 * - ai_multimodal: glm-4v 多模态分析 + RAG 上下文 + 素材 URL
 */

import type { Material } from '@/data/material.schema';
import type { KnowledgeEntry } from '@/data/knowledge.schema';
import type { DynamicDimensionCheckResult } from './types';
import { retrieveKnowledgeContext, buildDimensionPrompt } from '@/lib/knowledge/rag-service';

// ==================== 主入口 ====================

/**
 * 执行单个维度的审核检查
 * 根据维度的 check_type 自动分派到对应策略
 */
export async function executeDimensionCheck(params: {
    dimension: KnowledgeEntry;
    material: Material;
    teamId?: string;
}): Promise<DynamicDimensionCheckResult> {
    const { dimension, material, teamId } = params;

    try {
        switch (dimension.checkType) {
            case 'rule_based':
                return await executeRuleBasedCheck(dimension, material);

            case 'ai_text':
                return await executeAITextCheck(dimension, material, teamId);

            case 'ai_multimodal':
                return await executeAIMultimodalCheck(dimension, material, teamId);

            default:
                // 未知 check_type，降级为 AI 文本检查
                console.warn(`[DynamicChecker] 未知 check_type: ${dimension.checkType}，降级为 ai_text`);
                return await executeAITextCheck(dimension, material, teamId);
        }
    } catch (error: any) {
        console.error(`[DynamicChecker] 维度 "${dimension.title}" 检查失败:`, error.message);
        return {
            dimensionId: dimension.id,
            dimensionTitle: dimension.title,
            pass: true,
            rationale: `检查异常，默认放行: ${error.message}`,
            knowledgeIds: [],
        };
    }
}

// ==================== 策略 1: 规则判定 ====================

/**
 * 规则判定 — 从维度 criteria JSON 读取参数，纯逻辑运算
 * 典型场景: 时长范围、文件大小限制、分辨率要求
 */
async function executeRuleBasedCheck(
    dimension: KnowledgeEntry,
    material: Material
): Promise<DynamicDimensionCheckResult> {
    const criteria = (dimension.criteria || {}) as Record<string, any>;
    const result: DynamicDimensionCheckResult = {
        dimensionId: dimension.id,
        dimensionTitle: dimension.title,
        pass: true,
        rationale: '',
        knowledgeIds: [],
    };

    // --- 时长规则 ---
    if ('minSeconds' in criteria || 'maxSeconds' in criteria) {
        const duration = material.duration;
        if (!duration || duration <= 0) {
            result.rationale = '非视频类型或未提供时长，跳过考核。';
            return result;
        }

        const min = criteria.minSeconds as number | undefined;
        const max = criteria.maxSeconds as number | undefined;

        if (min !== undefined && duration < min) {
            result.pass = false;
            result.rationale = `视频过短 (${duration.toFixed(1)}s < ${min}s)，不符合分发规范。`;
            return result;
        }
        if (max !== undefined && duration > max) {
            result.pass = false;
            result.rationale = `视频过长 (${duration.toFixed(1)}s > ${max}s)，完播率风险极高。`;
            return result;
        }

        result.rationale = `时长 (${duration.toFixed(1)}s) 位于标准范围 [${min ?? '—'}s - ${max ?? '—'}s] 内。`;
        return result;
    }

    // --- 分辨率规则 ---
    if ('minWidth' in criteria || 'minHeight' in criteria) {
        const w = material.width || 0;
        const h = material.height || 0;
        const minW = (criteria.minWidth as number) || 0;
        const minH = (criteria.minHeight as number) || 0;

        if (w < minW || h < minH) {
            result.pass = false;
            result.rationale = `分辨率 ${w}x${h} 低于最低要求 ${minW}x${minH}。`;
            return result;
        }

        result.rationale = `分辨率 ${w}x${h} 满足要求 (>= ${minW}x${minH})。`;
        return result;
    }

    // --- 文件大小规则 ---
    if ('maxFileSizeMB' in criteria) {
        const fileSize = material.fileSize || 0;
        const maxMB = criteria.maxFileSizeMB as number;
        const fileMB = fileSize / (1024 * 1024);

        if (fileMB > maxMB) {
            result.pass = false;
            result.rationale = `文件过大 (${fileMB.toFixed(1)}MB > ${maxMB}MB)。`;
            return result;
        }

        result.rationale = `文件大小 (${fileMB.toFixed(1)}MB) 在限制范围内 (<= ${maxMB}MB)。`;
        return result;
    }

    // 无匹配规则 — 默认通过
    result.rationale = '规则检查通过（无匹配的 criteria 规则）。';
    return result;
}

// ==================== 策略 2: AI 文本分析 ====================

/**
 * AI 文本分析 — 使用 DeepSeek 对素材元信息进行文本审核
 * 结合 RAG 上下文增强 prompt
 */
async function executeAITextCheck(
    dimension: KnowledgeEntry,
    material: Material,
    teamId?: string
): Promise<DynamicDimensionCheckResult> {
    const result: DynamicDimensionCheckResult = {
        dimensionId: dimension.id,
        dimensionTitle: dimension.title,
        pass: true,
        rationale: '',
        knowledgeIds: [],
    };

    // 1. RAG 检索上下文
    let contextString = '暂无参考知识。';
    try {
        const ragResult = await retrieveKnowledgeContext({
            dimensionId: dimension.id,
            dimensionTitle: dimension.title,
            materialName: material.name,
            materialType: material.type,
            teamId,
        });
        contextString = ragResult.contextString;
        result.knowledgeIds = ragResult.knowledgeIds;
    } catch (e: any) {
        console.warn(`[DynamicChecker] RAG 检索失败 (${dimension.title}):`, e.message);
    }

    // 2. 构建 prompt
    const promptTemplate = dimension.promptTemplate || buildDefaultTextPrompt(dimension.title, dimension.content);
    const systemPrompt = buildDimensionPrompt(promptTemplate, contextString);

    // 3. 组装素材信息
    const materialInfo = buildMaterialInfoText(material);

    // 4. 调用 AI
    try {
        const { aiService } = await import('@/lib/ai/ai-service');
        const response = await aiService.generateText({
            systemPrompt,
            prompt: `请对以下素材进行「${dimension.title}」维度的审核：\n\n${materialInfo}\n\n请以 JSON 格式返回审核结果，字段包含 "pass" (布尔) 和 "rationale" (字符串，50字以内理由)。`,
            temperature: 0.1,
        });

        const parsed = parseAIJsonResponse(response.text);
        if (parsed) {
            result.pass = !!parsed.pass;
            result.rationale = parsed.rationale || `AI 完成「${dimension.title}」分析。`;
        } else {
            result.rationale = 'AI 返回内容无法解析为 JSON，默认放行。';
        }
    } catch (e: any) {
        console.warn(`[DynamicChecker] AI 文本分析失败 (${dimension.title}):`, e.message);
        result.rationale = `AI 文本分析遇到错误，已放行: ${e.message}`;
    }

    return result;
}

// ==================== 策略 3: AI 多模态分析 ====================

/**
 * AI 多模态分析 — 使用 glm-4v 视觉模型分析素材视频/图片
 * 结合 RAG 上下文增强 prompt
 */
async function executeAIMultimodalCheck(
    dimension: KnowledgeEntry,
    material: Material,
    teamId?: string
): Promise<DynamicDimensionCheckResult> {
    const result: DynamicDimensionCheckResult = {
        dimensionId: dimension.id,
        dimensionTitle: dimension.title,
        pass: true,
        rationale: '',
        knowledgeIds: [],
    };

    const url = material.src || (material as any).mediaUrl || (material as any).url;
    if (!url) {
        result.pass = false;
        result.rationale = '未提供素材播放地址，无法进行多模态分析。';
        return result;
    }

    // 1. RAG 检索上下文
    let contextString = '暂无参考知识。';
    try {
        const ragResult = await retrieveKnowledgeContext({
            dimensionId: dimension.id,
            dimensionTitle: dimension.title,
            materialName: material.name,
            materialType: material.type,
            teamId,
        });
        contextString = ragResult.contextString;
        result.knowledgeIds = ragResult.knowledgeIds;
    } catch (e: any) {
        console.warn(`[DynamicChecker] RAG 检索失败 (${dimension.title}):`, e.message);
    }

    // 2. 构建 prompt
    const promptTemplate = dimension.promptTemplate || buildDefaultMultimodalPrompt(dimension.title, dimension.content);
    const systemPrompt = buildDimensionPrompt(promptTemplate, contextString);

    // 3. 调用多模态 AI
    try {
        const { safeChatCompletion } = await import('@/lib/deduplication/tuyooGatewayService')
            .catch(() => ({ safeChatCompletion: null }));

        if (!safeChatCompletion) {
            result.rationale = 'AI 多模态服务未就绪，默认放行，建议人工抽查。';
            return result;
        }

        const messages = [
            { role: 'system', content: systemPrompt },
            {
                role: 'user',
                content: `视频链接: ${url}\n\n请对此素材进行「${dimension.title}」维度的审核，并返回 JSON 格式结果。`,
            },
        ];

        const resultObjStr = await safeChatCompletion({
            model: 'glm-4v',
            messages: messages as any,
            temperature: 0.1,
        });

        if (!resultObjStr) {
            result.rationale = '模型未召回有效内容，默认放行。';
            return result;
        }

        const parsed = parseAIJsonResponse(resultObjStr);
        if (parsed) {
            result.pass = !!parsed.pass;
            result.rationale = parsed.rationale || `AI 完成「${dimension.title}」多模态分析。`;
        } else {
            result.rationale = '分析结果不标准，默认放行。';
        }
    } catch (e: any) {
        console.warn(`[DynamicChecker] AI 多模态分析失败 (${dimension.title}):`, e.message);
        result.rationale = `多模态分析遇到错误，已放行: ${e.message}`;
    }

    return result;
}

// ==================== 工具函数 ====================

/**
 * 解析 AI 返回的 JSON（兼容 markdown code block 包裹）
 */
function parseAIJsonResponse(text: string): { pass: boolean; rationale: string } | null {
    try {
        // 尝试直接解析
        const direct = JSON.parse(text);
        if (typeof direct.pass === 'boolean') return direct;
    } catch {
        // 忽略
    }

    // 尝试提取 JSON 块
    const jsonMatch = text.match(/\{[\s\S]*?\}/);
    if (jsonMatch) {
        try {
            const parsed = JSON.parse(jsonMatch[0]);
            if (typeof parsed.pass === 'boolean') return parsed;
        } catch {
            // 忽略
        }
    }

    return null;
}

/**
 * 构建素材元信息文本（供 AI 文本分析使用）
 */
function buildMaterialInfoText(material: Material): string {
    const lines: string[] = [];
    lines.push(`- 素材名称: ${material.name}`);
    lines.push(`- 素材类型: ${material.type}`);
    if (material.duration) lines.push(`- 时长: ${material.duration.toFixed(1)}s`);
    if (material.width && material.height) lines.push(`- 分辨率: ${material.width}x${material.height}`);
    if (material.src) lines.push(`- 文件地址: ${material.src}`);
    if (material.project) lines.push(`- 所属项目: ${material.project}`);
    if (material.tag) lines.push(`- 标签: ${material.tag}`);
    return lines.join('\n');
}

/**
 * 默认文本分析 prompt（当维度未配置自定义 promptTemplate 时使用）
 */
function buildDefaultTextPrompt(title: string, content: string): string {
    return `你是一个视频审核硬性指标审查员。你需要根据以下维度对素材进行审核判定：

## 审核维度: ${title}

${content}

## 参考知识

{{context}}

## 输出要求

回复必须是 JSON，字段包含 "pass" (布尔) 和 "rationale" (字符串，包含 50 字以内理由)。`;
}

/**
 * 默认多模态分析 prompt（当维度未配置自定义 promptTemplate 时使用）
 */
function buildDefaultMultimodalPrompt(title: string, content: string): string {
    return `你是一个视频审核硬性指标审查员。你需要根据以下维度对素材视频/图片进行视觉审核判定：

## 审核维度: ${title}

${content}

## 参考知识

{{context}}

## 输出要求

回复必须是 JSON，字段包含 "pass" (布尔) 和 "rationale" (字符串，包含 50 字以内理由)。`;
}
