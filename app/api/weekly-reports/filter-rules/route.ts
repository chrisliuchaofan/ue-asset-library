import { NextResponse } from 'next/server';
import { requireTeamAccess, isErrorResponse } from '@/lib/team/require-team';
import { ruleLibraryService } from '@/lib/weekly-report/rule-library';
import type { CreateFilterRuleRequest, UpdateFilterRuleRequest } from '@/lib/weekly-report/rule-library';

export const dynamic = 'force-dynamic';

/**
 * GET /api/weekly-reports/filter-rules
 * 获取用户的规则列表
 */
export async function GET() {
  try {
    const ctx = await requireTeamAccess('content:read');
    if (isErrorResponse(ctx)) return ctx;

    const rules = await ruleLibraryService.getRules(ctx.userId);

    return NextResponse.json({ rules });
  } catch (error: any) {
    console.error('[API] 获取规则列表失败:', error);
    return NextResponse.json(
      { error: error.message || '获取规则列表失败' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/weekly-reports/filter-rules
 * 创建新规则
 */
export async function POST(request: Request) {
  try {
    const ctx = await requireTeamAccess('content:create');
    if (isErrorResponse(ctx)) return ctx;

    const body: CreateFilterRuleRequest = await request.json();

    // 验证请求数据
    if (!body.name || !body.ruleText) {
      return NextResponse.json(
        { error: '规则名称和规则文本不能为空' },
        { status: 400 }
      );
    }

    const rule = await ruleLibraryService.addRule(ctx.userId, body);

    return NextResponse.json({ rule }, { status: 201 });
  } catch (error: any) {
    console.error('[API] 创建规则失败:', error);
    return NextResponse.json(
      { error: error.message || '创建规则失败' },
      { status: 500 }
    );
  }
}
