import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireTeamAccess, isErrorResponse } from '@/lib/team/require-team';
import { dbCreatePromptDoc, dbGetPromptDocs } from '@/lib/prompt-library/prompt-cases-db';

const CreatePromptDocSchema = z.object({
  title: z.string().min(1),
  content: z.string().optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  attachmentUrl: z.string().url().optional(),
  attachmentName: z.string().optional(),
}).refine((value) => Boolean(value.content?.trim() || value.attachmentUrl), {
  message: 'content or attachmentUrl is required',
  path: ['content'],
});

export async function GET() {
  try {
    const ctx = await requireTeamAccess('content:read');
    if (isErrorResponse(ctx)) return ctx;

    const docs = await dbGetPromptDocs(ctx.teamId);
    return NextResponse.json({ docs });
  } catch (error: any) {
    console.error('[PromptLibrary] 获取文档失败:', error);
    return NextResponse.json({ docs: [], error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await requireTeamAccess('content:create');
    if (isErrorResponse(ctx)) return ctx;

    const parsed = CreatePromptDocSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { message: 'Invalid prompt doc payload', errors: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const doc = await dbCreatePromptDoc(
      {
        ...parsed.data,
        content: parsed.data.content?.trim() || `附件文档：${parsed.data.attachmentName || parsed.data.attachmentUrl}`,
      },
      {
        teamId: ctx.teamId,
        userId: ctx.userId,
      },
    );

    return NextResponse.json({ doc }, { status: 201 });
  } catch (error: any) {
    console.error('[PromptLibrary] Create prompt doc failed:', error);
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
