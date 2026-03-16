import { NextResponse } from 'next/server';
import { parseExcelFile, analyzeMaterials } from '@/lib/weekly-report/material-analyzer';
import { generateReportSummary } from '@/lib/weekly-report/ai-service';
import { createWeeklyReport, updateWeeklyReport } from '@/lib/weekly-report/db-service';
import { matchReportMaterials, applyMatchResults } from '@/lib/weekly-report/material-matcher';
import { requireTeamAccess, isErrorResponse } from '@/lib/team/require-team';
import type { CreateWeeklyReportRequest, ReportMaterial } from '@/types/weekly-report';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 300 秒（5分钟）超时，AI 生成和数据库操作可能需要较长时间

export async function POST(request: Request) {
  try {
    const ctx = await requireTeamAccess('content:create');
    if (isErrorResponse(ctx)) return ctx;
    const contentType = request.headers.get('content-type') || '';
    let materials: ReportMaterial[];
    let weekDateRange: string;
    let weekStartDate: string;
    let weekEndDate: string;
    let excelFileName: string;
    let skipAI = false;
    let stats: any = null;

    // 支持两种方式：FormData（文件上传）或 JSON（已清理的数据）
    if (contentType.includes('application/json')) {
      // JSON 方式：接收已清理的数据
      const body = await request.json();
      materials = body.materials || [];
      weekDateRange = body.weekDateRange;
      weekStartDate = body.weekStartDate;
      weekEndDate = body.weekEndDate;
      excelFileName = body.excelFileName || 'unknown.xlsx';
      skipAI = body.skipAI === true;
      stats = body.stats || null;

      if (!materials || materials.length === 0) {
        return NextResponse.json(
          { message: '没有有效数据' },
          { status: 400 }
        );
      }

      if (!weekDateRange || !weekStartDate || !weekEndDate) {
        return NextResponse.json(
          { message: '请提供周报日期范围' },
          { status: 400 }
        );
      }

      console.log(`[Weekly Report] 接收已清理的数据，共 ${materials.length} 条`);
    } else {
      // FormData 方式：传统文件上传（向后兼容）
      const formData = await request.formData();

      const file = formData.get('file') as File;
      if (!file) {
        return NextResponse.json(
          { message: '请上传 Excel 文件' },
          { status: 400 }
        );
      }

      const fileName = file.name.toLowerCase();
      if (!fileName.endsWith('.xlsx') && !fileName.endsWith('.xls')) {
        return NextResponse.json(
          { message: '只支持 Excel 文件（.xlsx 或 .xls）' },
          { status: 400 }
        );
      }

      const fileSize = file.size;
      const maxSize = 10 * 1024 * 1024;
      if (fileSize > maxSize) {
        return NextResponse.json(
          { message: `文件大小超过限制（最大 10MB）` },
          { status: 400 }
        );
      }

      weekDateRange = formData.get('weekDateRange') as string;
      weekStartDate = formData.get('weekStartDate') as string;
      weekEndDate = formData.get('weekEndDate') as string;
      excelFileName = file.name;

      if (!weekDateRange || !weekStartDate || !weekEndDate) {
        return NextResponse.json(
          { message: '请提供周报日期范围' },
          { status: 400 }
        );
      }

      console.log('[Weekly Report] 开始解析 Excel 文件...');
      const parseStartTime = Date.now();
      materials = await parseExcelFile(file);
      const parseDuration = Date.now() - parseStartTime;
      console.log(`[Weekly Report] Excel 解析完成，耗时 ${parseDuration}ms，共 ${materials.length} 条数据`);

      if (materials.length === 0) {
        return NextResponse.json(
          { message: 'Excel 文件中没有有效数据' },
          { status: 400 }
        );
      }

      if (materials.length > 1000) {
        console.warn(`[Weekly Report] 警告：数据量较大（${materials.length} 条），可能影响性能`);
      }
    }

    // 4. 分析数据，计算统计（如果未提供，则重新计算）
    if (!stats) {
      stats = analyzeMaterials(materials);
    }
    const totalConsumption = stats.totalConsumption;

    // 5. 立即保存报告到数据库
    // 如果 skipAI 为 true，只使用降级总结；否则先使用降级总结，AI 生成后更新
    const fallbackSummary = `• 本周总消耗 ${totalConsumption.toLocaleString('zh-CN')}\n• 共使用 ${materials.length} 个素材`;

    const reportData: CreateWeeklyReportRequest = {
      week_date_range: weekDateRange,
      week_start_date: weekStartDate,
      week_end_date: weekEndDate,
      summary_text: skipAI ? fallbackSummary : undefined, // 如果跳过 AI，直接使用降级总结
      report_data: materials,
      excel_file_name: excelFileName,
      total_materials: materials.length,
      total_consumption: totalConsumption,
    };

    // 6. 保存到数据库（这是唯一可能超时的操作，但应该很快）
    console.log('[Weekly Report] 开始保存报告到数据库...');
    const saveStartTime = Date.now();
    const report = await createWeeklyReport(reportData, ctx.teamId, ctx.userId);
    const saveDuration = Date.now() - saveStartTime;
    console.log(`[Weekly Report] 报告保存成功，耗时 ${saveDuration}ms`);

    // 7. 立即返回响应（不等待任何 AI 操作）
    const response = NextResponse.json({
      success: true,
      data: report,
      message: '报告已生成，AI 总结正在后台生成中...',
    });

    // 7.5 后台素材匹配 — 将周报素材关联到素材库
    setTimeout(async () => {
      try {
        console.log('[Weekly Report] 开始后台素材匹配...');
        const matchSummary = await matchReportMaterials(materials);
        if (matchSummary.matched > 0) {
          const enrichedMaterials = applyMatchResults(materials, matchSummary);
          await updateWeeklyReport(
            report.id,
            { report_data: enrichedMaterials } as any,
            ctx.teamId
          );
          console.log(
            `[Weekly Report] 素材匹配完成: ${matchSummary.matched}/${matchSummary.total} ` +
            `(精确 ${matchSummary.exactMatches}, 模糊 ${matchSummary.fuzzyMatches})`
          );
        } else {
          console.log('[Weekly Report] 素材匹配完成: 未找到匹配');
        }
      } catch (err) {
        console.error('[Weekly Report] 素材匹配失败（不影响主流程）:', err);
      }
    });

    // 8. AI 总结完全在后台异步生成（如果 skipAI 为 false）
    if (!skipAI) {
      // 使用 setTimeout(0) 确保响应先返回，避免阻塞
      setTimeout(async () => {
        const aiStartTime = Date.now();
        console.log('[Weekly Report] 开始后台生成 AI 总结...');

        try {
          // 使用 Promise.race 添加超时控制（15秒）
          const aiSummaryPromise = generateReportSummary(stats, weekDateRange).catch((error) => {
            console.error('[Weekly Report] AI 生成总结失败:', error);
            return null;
          });

          const timeoutPromise = new Promise<string | null>((resolve) => {
            setTimeout(() => {
              console.warn('[Weekly Report] AI 生成总结超时（60秒）');
              resolve(null);
            }, 60000); // 60秒超时（增加到1分钟）
          });

          const summaryText = await Promise.race([aiSummaryPromise, timeoutPromise]);
          const aiDuration = Date.now() - aiStartTime;

          // 更新报告
          if (summaryText) {
            console.log(`[Weekly Report] AI 总结生成成功，耗时 ${aiDuration}ms`);
            await updateWeeklyReport(report.id, { summary_text: summaryText }, ctx.teamId);
          } else {
            console.log(`[Weekly Report] AI 总结生成失败或超时，使用降级方案，耗时 ${aiDuration}ms`);
            // 降级方案已经在创建时设置了，这里不需要再次更新
          }
        } catch (error) {
          console.error('[Weekly Report] 后台更新 AI 总结失败:', error);
          // 静默失败，不影响主流程，降级方案已经设置
        }
      });
    }

    return response;
  } catch (error: any) {
    console.error('上传周报失败:', error);
    return NextResponse.json(
      {
        message: error.message || '上传周报失败',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
