import { NextResponse } from 'next/server';
import { getWeeklyReports } from '@/lib/weekly-report/db-service';
import { requireTeamAccess, isErrorResponse } from '@/lib/team/require-team';

export const dynamic = 'force-dynamic';

/**
 * GET /api/weekly-reports
 * 查询周报列表
 */
export async function GET(request: Request) {
  try {
    const ctx = await requireTeamAccess('content:read');
    if (isErrorResponse(ctx)) return ctx;

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const reports = await getWeeklyReports(limit, offset, ctx.teamId);

    return NextResponse.json({
      success: true,
      data: reports,
      pagination: {
        limit,
        offset,
        total: reports.length, // 注意：这里返回的是当前页的数量，不是总数
      },
    });
  } catch (error: any) {
    console.error('查询周报列表失败:', error);
    return NextResponse.json(
      {
        message: error.message || '查询周报列表失败',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
