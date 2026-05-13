import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireTeamAccess, isErrorResponse } from '@/lib/team/require-team';
import { getMaterialById } from '@/lib/materials-data';
import { dbCreatePromptCase, dbGetPromptCases } from '@/lib/prompt-library/prompt-cases-db';

const CreatePromptCaseSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  prompt: z.string().min(1),
  negativePrompt: z.string().optional(),
  tool: z.string().optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  mediaType: z.enum(['image', 'video']),
  sourceMaterialId: z.string().min(1),
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const cases = await dbGetPromptCases({
      q: searchParams.get('q') || undefined,
      tool: searchParams.get('tool') || undefined,
      category: searchParams.get('category') || undefined,
      tag: searchParams.get('tag') || undefined,
      mediaType: (searchParams.get('mediaType') as any) || 'all',
      status: 'published',
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

export async function POST(request: Request) {
  try {
    const ctx = await requireTeamAccess('content:create');
    if (isErrorResponse(ctx)) return ctx;

    const parsed = CreatePromptCaseSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { message: 'Invalid prompt case payload', errors: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const material = await getMaterialById(parsed.data.sourceMaterialId, { teamId: ctx.teamId });
    if (!material) {
      return NextResponse.json({ message: 'Source material not found or not accessible' }, { status: 404 });
    }

    const promptCase = await dbCreatePromptCase(parsed.data, {
      teamId: ctx.teamId,
      userId: ctx.userId,
    });

    return NextResponse.json({ case: promptCase }, { status: 201 });
  } catch (error: any) {
    console.error('[PromptLibrary] Create prompt case failed:', error);
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
