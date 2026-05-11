import { NextResponse } from 'next/server';
import { requireTeamAccess, isErrorResponse } from '@/lib/team/require-team';
import { dbGetPromptCaseById } from '@/lib/prompt-library/prompt-cases-db';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireTeamAccess('content:read');
    if (isErrorResponse(ctx)) return ctx;

    const { id } = await params;
    const promptCase = await dbGetPromptCaseById(id, ctx.teamId);
    if (!promptCase) {
      return NextResponse.json({ message: '未找到案例' }, { status: 404 });
    }

    return NextResponse.json({ case: promptCase });
  } catch (error: any) {
    console.error('[PromptLibrary] 获取案例详情失败:', error);
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
