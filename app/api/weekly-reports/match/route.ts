import { NextResponse } from 'next/server';
import { matchReportMaterials, applyMatchResults, writebackMetrics } from '@/lib/weekly-report/material-matcher';
import type { ReportMaterial } from '@/types/weekly-report';
import { z } from 'zod';

/**
 * POST /api/weekly-reports/match
 *
 * 将周报素材列表与素材库进行匹配
 * 返回匹配结果 + 回填了 material_id 的素材列表
 */

const MatchRequestSchema = z.object({
  materials: z.array(z.object({
    name: z.string(),
  }).passthrough()).min(1, '至少需要一条素材'),
  /** 模糊匹配阈值 0-1 (默认 0.7) */
  fuzzyThreshold: z.number().min(0).max(1).optional(),
  /** 是否将投放数据回写到素材库 (默认 false) */
  writeback: z.boolean().optional(),
  /** 报表周期标识（回写时必填） */
  reportPeriod: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = MatchRequestSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { message: '参数验证失败', errors: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { materials, fuzzyThreshold, writeback, reportPeriod } = parsed.data;
    const reportMaterials = materials as ReportMaterial[];

    // 执行匹配
    const matchSummary = await matchReportMaterials(reportMaterials, fuzzyThreshold);

    // 回填 material_id
    const enrichedMaterials = applyMatchResults(reportMaterials, matchSummary);

    // V3: 数据反标 — 将投放数据回写到素材库
    let writebackResult = null;
    if (writeback && reportPeriod && matchSummary.matched > 0) {
      writebackResult = await writebackMetrics(enrichedMaterials, reportPeriod);
    }

    return NextResponse.json({
      summary: {
        total: matchSummary.total,
        matched: matchSummary.matched,
        exactMatches: matchSummary.exactMatches,
        fuzzyMatches: matchSummary.fuzzyMatches,
        unmatched: matchSummary.unmatched,
      },
      // 匹配详情（前 100 条，避免传输过大）
      details: matchSummary.results.slice(0, 100).map(r => ({
        reportIndex: r.reportIndex,
        matchType: r.matchType,
        confidence: r.confidence,
        reason: r.reason,
        materialId: r.material?.id || null,
        materialName: r.material?.name || null,
      })),
      // 回填了 material_id 的素材列表
      materials: enrichedMaterials,
      // V3: 回写结果（如果执行了回写）
      writeback: writebackResult,
    });
  } catch (error) {
    console.error('[weekly-reports/match] 错误:', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : '匹配失败' },
      { status: 500 },
    );
  }
}
