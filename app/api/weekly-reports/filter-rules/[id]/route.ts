import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { ruleLibraryService } from '@/lib/weekly-report/rule-library';
import type { UpdateFilterRuleRequest } from '@/lib/weekly-report/rule-library';

export const dynamic = 'force-dynamic';

/**
 * PUT /api/weekly-reports/filter-rules/[id]
 * 更新规则
 */
export async function PUT(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const userId = session.user.id || session.user.email;
    const params = await props.params;
    const ruleId = params.id;
    const body: UpdateFilterRuleRequest = await request.json();

    // 验证规则是否存在且属于当前用户
    const existingRule = await ruleLibraryService.getRule(ruleId, userId);
    if (!existingRule) {
      return NextResponse.json({ error: '规则不存在' }, { status: 404 });
    }

    const rule = await ruleLibraryService.updateRule(ruleId, userId, body);

    return NextResponse.json({ rule });
  } catch (error: any) {
    console.error('[API] 更新规则失败:', error);
    return NextResponse.json(
      { error: error.message || '更新规则失败' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/weekly-reports/filter-rules/[id]
 * 删除规则
 */
export async function DELETE(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const userId = session.user.id || session.user.email;
    const params = await props.params;
    const ruleId = params.id;

    // 验证规则是否存在且属于当前用户
    const existingRule = await ruleLibraryService.getRule(ruleId, userId);
    if (!existingRule) {
      return NextResponse.json({ error: '规则不存在' }, { status: 404 });
    }

    await ruleLibraryService.deleteRule(ruleId, userId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[API] 删除规则失败:', error);
    return NextResponse.json(
      { error: error.message || '删除规则失败' },
      { status: 500 }
    );
  }
}
