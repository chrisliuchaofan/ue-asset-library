import { NextResponse } from 'next/server';
import { getWeeklyReportById, deleteWeeklyReport } from '@/lib/weekly-report/db-service';
import { requireTeamAccess, isErrorResponse } from '@/lib/team/require-team';

export const dynamic = 'force-dynamic';

/**
 * GET /api/weekly-reports/[id]
 * 获取单个周报详情
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireTeamAccess('content:read');
    if (isErrorResponse(ctx)) return ctx;

    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { message: '缺少报告 ID' },
        { status: 400 }
      );
    }

    const report = await getWeeklyReportById(id, ctx.teamId);

    if (!report) {
      return NextResponse.json(
        { message: '报告不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: report,
    });
  } catch (error: any) {
    console.error('查询周报详情失败:', error);
    return NextResponse.json(
      {
        message: error.message || '查询周报详情失败',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/weekly-reports/[id]
 * 删除周报
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireTeamAccess('content:delete');
    if (isErrorResponse(ctx)) return ctx;

    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { message: '缺少报告 ID' },
        { status: 400 }
      );
    }

    await deleteWeeklyReport(id, ctx.teamId);

    return NextResponse.json({
      success: true,
      message: '删除成功',
    });
  } catch (error: any) {
    console.error('删除周报失败:', error);
    return NextResponse.json(
      {
        message: error.message || '删除周报失败',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
