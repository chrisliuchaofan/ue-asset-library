import { NextResponse } from 'next/server';
import { requireTeamAccess, isErrorResponse } from '@/lib/team/require-team';
import { dbGetPromptDocs } from '@/lib/prompt-library/prompt-cases-db';

export async function GET() {
  try {
    const ctx = await requireTeamAccess('content:read');
    const teamId = isErrorResponse(ctx) ? undefined : ctx.teamId;

    const docs = await dbGetPromptDocs(teamId);
    return NextResponse.json({ docs });
  } catch (error: any) {
    console.error('[PromptLibrary] 获取文档失败:', error);
    return NextResponse.json({ docs: [], error: error.message }, { status: 500 });
  }
}
