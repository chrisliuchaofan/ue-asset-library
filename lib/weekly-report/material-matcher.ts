/**
 * 素材匹配服务 — V2.2.2
 *
 * 将周报 Excel 中的素材名称匹配到素材库中的素材。
 * 匹配策略:
 *   1. 精确匹配: platform_name == Excel name
 *   2. 模糊匹配: name 包含/被包含 + 编辑距离
 */

import { supabaseAdmin } from '@/lib/supabase/admin';
import type { Material } from '@/data/material.schema';
import type { ReportMaterial } from '@/types/weekly-report';

// ==================== 类型 ====================

export interface MatchResult {
  /** 周报素材索引 */
  reportIndex: number;
  /** 匹配到的素材库 material */
  material: Material | null;
  /** 匹配方式 */
  matchType: 'exact' | 'fuzzy' | 'none';
  /** 置信度 0-1 */
  confidence: number;
  /** 匹配依据描述 */
  reason: string;
}

export interface MatchSummary {
  total: number;
  matched: number;
  exactMatches: number;
  fuzzyMatches: number;
  unmatched: number;
  results: MatchResult[];
}

// ==================== 工具函数 ====================

/**
 * Levenshtein 编辑距离
 */
function levenshteinDistance(a: string, b: string): number {
  const an = a.length;
  const bn = b.length;
  if (an === 0) return bn;
  if (bn === 0) return an;

  const matrix: number[][] = [];

  for (let i = 0; i <= an; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= bn; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= an; i++) {
    for (let j = 1; j <= bn; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,      // 删除
        matrix[i][j - 1] + 1,      // 插入
        matrix[i - 1][j - 1] + cost // 替换
      );
    }
  }

  return matrix[an][bn];
}

/**
 * 标准化名称（去除常见噪音）
 */
function normalizeName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    // 去掉扩展名
    .replace(/\.(mp4|mov|webm|avi|mkv|jpg|jpeg|png|webp|gif)$/i, '')
    // 去掉前后空白和特殊字符
    .replace(/^[\s#_\-]+|[\s#_\-]+$/g, '');
}

/**
 * 计算名称相似度 (0-1)
 * 综合使用编辑距离、包含关系、前缀匹配
 */
function nameSimilarity(a: string, b: string): { score: number; reason: string } {
  const na = normalizeName(a);
  const nb = normalizeName(b);

  if (!na || !nb) return { score: 0, reason: '名称为空' };

  // 完全相同
  if (na === nb) return { score: 1.0, reason: '名称完全匹配' };

  // 一方包含另一方（且被包含的长度 >= 原名 60%）
  if (na.includes(nb) && nb.length >= na.length * 0.6) {
    return { score: 0.85, reason: `素材库名称被包含` };
  }
  if (nb.includes(na) && na.length >= nb.length * 0.6) {
    return { score: 0.85, reason: `周报名称被包含` };
  }

  // 较短的完整包含在较长的中
  if (na.includes(nb) || nb.includes(na)) {
    const shorter = na.length < nb.length ? na : nb;
    const longer = na.length < nb.length ? nb : na;
    const ratio = shorter.length / longer.length;
    if (ratio >= 0.5) {
      return { score: 0.7 + ratio * 0.15, reason: '部分名称匹配' };
    }
  }

  // 编辑距离相似度
  const maxLen = Math.max(na.length, nb.length);
  const dist = levenshteinDistance(na, nb);
  const editScore = 1 - dist / maxLen;

  if (editScore >= 0.75) {
    return { score: editScore, reason: `编辑距离相似 (${Math.round(editScore * 100)}%)` };
  }

  return { score: editScore, reason: '相似度较低' };
}

// ==================== 核心匹配逻辑 ====================

/**
 * 获取素材库中所有素材（用于匹配）
 * 只查询需要的字段，减少数据传输
 */
async function fetchMaterialsForMatching(): Promise<Material[]> {
  const { data, error } = await (supabaseAdmin as any)
    .from('materials')
    .select('id, name, platform_name, platform_id, material_naming, type, project, tag, status, consumption, roi, src, thumbnail')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[MaterialMatcher] 查询素材失败:', error);
    return [];
  }

  // 简化映射，只需要匹配用到的字段
  return (data || []).map((row: any) => ({
    id: row.id,
    name: row.name,
    platformName: row.platform_name || undefined,
    platformId: row.platform_id || undefined,
    materialNaming: row.material_naming || undefined,
    type: row.type,
    project: row.project,
    tag: row.tag,
    status: row.status || 'draft',
    consumption: row.consumption,
    roi: row.roi,
    src: row.src,
    thumbnail: row.thumbnail,
    // 以下是 Material 类型必需但匹配不关心的字段
    source: 'internal' as const,
    quality: [],
  })) as Material[];
}

/**
 * 尝试匹配单个周报素材到素材库
 */
function matchSingle(
  reportMaterial: ReportMaterial,
  materials: Material[],
  fuzzyThreshold: number = 0.7
): { material: Material | null; matchType: 'exact' | 'fuzzy' | 'none'; confidence: number; reason: string } {
  const excelName = reportMaterial.name;

  // 1. 精确匹配 platform_name
  for (const m of materials) {
    if (m.platformName && normalizeName(m.platformName) === normalizeName(excelName)) {
      return {
        material: m,
        matchType: 'exact',
        confidence: 1.0,
        reason: '投放命名精确匹配',
      };
    }
  }

  // 1.5 精确匹配 material_naming（V3 命名系统）
  for (const m of materials) {
    if ((m as any).materialNaming && normalizeName((m as any).materialNaming) === normalizeName(excelName)) {
      return {
        material: m,
        matchType: 'exact',
        confidence: 0.98,
        reason: '标准命名精确匹配',
      };
    }
  }

  // 2. 精确匹配 name
  for (const m of materials) {
    if (normalizeName(m.name) === normalizeName(excelName)) {
      return {
        material: m,
        matchType: 'exact',
        confidence: 0.95,
        reason: '素材名称精确匹配',
      };
    }
  }

  // 3. 模糊匹配 — 找最佳候选
  let bestMatch: Material | null = null;
  let bestScore = 0;
  let bestReason = '';

  for (const m of materials) {
    // 对比 platform_name（模糊）
    if (m.platformName) {
      const { score, reason } = nameSimilarity(excelName, m.platformName);
      if (score > bestScore) {
        bestScore = score;
        bestMatch = m;
        bestReason = `投放命名${reason}`;
      }
    }

    // 对比 name（模糊）
    const { score, reason } = nameSimilarity(excelName, m.name);
    if (score > bestScore) {
      bestScore = score;
      bestMatch = m;
      bestReason = `素材名${reason}`;
    }
  }

  if (bestScore >= fuzzyThreshold && bestMatch) {
    return {
      material: bestMatch,
      matchType: 'fuzzy',
      confidence: bestScore,
      reason: bestReason,
    };
  }

  return { material: null, matchType: 'none', confidence: 0, reason: '未找到匹配素材' };
}

// ==================== 对外接口 ====================

/**
 * 批量匹配周报素材到素材库
 *
 * @param reportMaterials 周报素材列表
 * @param fuzzyThreshold 模糊匹配阈值 (默认 0.7)
 * @returns 匹配结果摘要
 */
export async function matchReportMaterials(
  reportMaterials: ReportMaterial[],
  fuzzyThreshold: number = 0.7
): Promise<MatchSummary> {
  console.log(`[MaterialMatcher] 开始匹配 ${reportMaterials.length} 条周报素材...`);

  // 获取素材库数据
  const materials = await fetchMaterialsForMatching();
  console.log(`[MaterialMatcher] 素材库共 ${materials.length} 条素材`);

  const results: MatchResult[] = [];
  let exactMatches = 0;
  let fuzzyMatches = 0;

  for (let i = 0; i < reportMaterials.length; i++) {
    const rm = reportMaterials[i];
    const { material, matchType, confidence, reason } = matchSingle(rm, materials, fuzzyThreshold);

    results.push({
      reportIndex: i,
      material,
      matchType,
      confidence,
      reason,
    });

    if (matchType === 'exact') exactMatches++;
    else if (matchType === 'fuzzy') fuzzyMatches++;
  }

  const matched = exactMatches + fuzzyMatches;
  console.log(
    `[MaterialMatcher] 匹配完成: ${matched}/${reportMaterials.length} ` +
    `(精确 ${exactMatches}, 模糊 ${fuzzyMatches}, 未匹配 ${reportMaterials.length - matched})`
  );

  return {
    total: reportMaterials.length,
    matched,
    exactMatches,
    fuzzyMatches,
    unmatched: reportMaterials.length - matched,
    results,
  };
}

/**
 * 应用匹配结果到周报素材列表
 * 回填 material_id, match_type, match_confidence 字段
 */
export function applyMatchResults(
  reportMaterials: ReportMaterial[],
  matchSummary: MatchSummary
): ReportMaterial[] {
  return reportMaterials.map((rm, i) => {
    const result = matchSummary.results[i];
    if (!result || result.matchType === 'none') return rm;

    return {
      ...rm,
      material_id: result.material?.id,
      match_type: result.matchType,
      match_confidence: result.confidence,
    };
  });
}

// ==================== V3: 数据反标 ====================

export interface MetricsWritebackResult {
  total: number;
  updated: number;
  failed: number;
  details: { materialId: string; success: boolean; error?: string }[];
}

/**
 * 将周报中的投放数据回写到素材库
 * 匹配成功的素材，将消耗/展示/点击/CTR/CPC 等数据写入 materials 表
 *
 * @param reportMaterials 已匹配过的周报素材列表（含 material_id）
 * @param reportPeriod 报表周期标识（如 "2026-03-10 ~ 2026-03-16"）
 */
export async function writebackMetrics(
  reportMaterials: ReportMaterial[],
  reportPeriod: string
): Promise<MetricsWritebackResult> {
  const matched = reportMaterials.filter(rm => rm.material_id);
  const details: MetricsWritebackResult['details'] = [];
  let updated = 0;
  let failed = 0;

  for (const rm of matched) {
    try {
      const updateData: Record<string, unknown> = {
        report_period: reportPeriod,
        updated_at: new Date().toISOString(),
      };

      // 映射周报字段到素材库字段
      if (rm.consumption !== undefined) updateData.consumption = rm.consumption;
      if (rm.impressions !== undefined) updateData.impressions = rm.impressions;
      if (rm.clicks !== undefined) updateData.clicks = rm.clicks;
      if (rm.ctr !== undefined) updateData.ctr = rm.ctr;
      if (rm.cpc !== undefined) updateData.cpc = rm.cpc;
      if (rm.cpm !== undefined) updateData.cpm = rm.cpm;
      if (rm.conversions !== undefined) updateData.conversions = rm.conversions;
      if (rm.roi !== undefined) updateData.roi = rm.roi;
      if (rm.newUserCost !== undefined) updateData.new_user_cost = rm.newUserCost;
      if (rm.firstDayPayCount !== undefined) updateData.first_day_pay_count = rm.firstDayPayCount;
      if (rm.firstDayPayCost !== undefined) updateData.first_day_pay_cost = rm.firstDayPayCost;

      const { error } = await (supabaseAdmin as any)
        .from('materials')
        .update(updateData)
        .eq('id', rm.material_id);

      if (error) {
        failed++;
        details.push({ materialId: rm.material_id!, success: false, error: error.message });
      } else {
        updated++;
        details.push({ materialId: rm.material_id!, success: true });
      }
    } catch (e: any) {
      failed++;
      details.push({ materialId: rm.material_id!, success: false, error: e.message });
    }
  }

  console.log(`[MetricsWriteback] 回写完成: ${updated} 成功, ${failed} 失败, 共 ${matched.length} 条`);

  return {
    total: matched.length,
    updated,
    failed,
    details,
  };
}
