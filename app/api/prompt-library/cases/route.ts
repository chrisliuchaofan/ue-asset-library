import { NextResponse } from 'next/server';
import { requireTeamAccess, isErrorResponse } from '@/lib/team/require-team';
import { dbGetPromptCases } from '@/lib/prompt-library/prompt-cases-db';

export async function GET(request: Request) {
  try {
    const ctx = await requireTeamAccess('content:read');
    const teamId = isErrorResponse(ctx) ? undefined : ctx.teamId;

    const { searchParams } = new URL(request.url);
    const cases = await dbGetPromptCases({
      q: searchParams.get('q') || undefined,
      tool: searchParams.get('tool') || undefined,
      category: searchParams.get('category') || undefined,
      tag: searchParams.get('tag') || undefined,
      mediaType: (searchParams.get('mediaType') as any) || 'all',
      status: 'published',
      teamId,
      limit: 200,
    });

    const tools = Array.from(new Set(cases.map((item) => item.tool).filter(Boolean))) as string[];
    const categories = Array.from(new Set(cases.map((item) => item.category).filter(Boolean))) as string[];
    const tags = Array.from(new Set(cases.flatMap((item) => item.tags))).filter(Boolean);

    return NextResponse.json({ cases, facets: { tools, categories, tags } });
  } catch (error: any) {
    console.error('[PromptLibrary] 获取案例失败:', error);
    return NextResponse.json({ cases: [], facets: { tools: [], categories: [], tags: [] }, error: error.message }, { status: 500 });
  }
}
