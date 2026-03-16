import { NextResponse } from 'next/server';
import { InspirationUpdateSchema } from '@/data/inspiration.schema';
import { requireTeamAccess, isErrorResponse } from '@/lib/team/require-team';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

/**
 * GET /api/inspirations/[id] - 获取单个灵感
 * Phase 2: 按 team_id 隔离
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireTeamAccess('content:read');
    if (isErrorResponse(ctx)) return ctx;

    const { id } = await params;

    let query = (supabaseAdmin.from('inspirations') as any)
      .select('*')
      .eq('id', id)
      .eq('user_id', ctx.userId);

    if (ctx.teamId) {
      query = query.eq('team_id', ctx.teamId);
    }

    const { data, error } = await query.single();

    if (error || !data) {
      return NextResponse.json({ message: '灵感不存在' }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('[API /inspirations/[id] GET]', error);
    const message = error instanceof Error ? error.message : '获取灵感失败';
    return NextResponse.json({ message }, { status: 500 });
  }
}

/**
 * PUT /api/inspirations/[id] - 更新灵感
 * Phase 2: 按 team_id 隔离
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireTeamAccess('content:update');
    if (isErrorResponse(ctx)) return ctx;

    const { id } = await params;
    const json = await request.json();

    const parsed = InspirationUpdateSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { message: '参数验证失败', errors: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // 确认灵感属于当前用户和团队
    let existQuery = (supabaseAdmin.from('inspirations') as any)
      .select('id')
      .eq('id', id)
      .eq('user_id', ctx.userId);

    if (ctx.teamId) {
      existQuery = existQuery.eq('team_id', ctx.teamId);
    }

    const { data: existing } = await existQuery.single();

    if (!existing) {
      return NextResponse.json({ message: '灵感不存在' }, { status: 404 });
    }

    // 构建更新数据
    const updateData: Record<string, any> = {};
    if (parsed.data.title !== undefined) updateData.title = parsed.data.title;
    if (parsed.data.content !== undefined) updateData.content = parsed.data.content;
    if (parsed.data.media_urls !== undefined) updateData.media_urls = parsed.data.media_urls;
    if (parsed.data.voice_url !== undefined) updateData.voice_url = parsed.data.voice_url;
    if (parsed.data.tags !== undefined) updateData.tags = parsed.data.tags;
    if (parsed.data.source !== undefined) updateData.source = parsed.data.source;
    if (parsed.data.status !== undefined) updateData.status = parsed.data.status;
    if (parsed.data.reference_url !== undefined) updateData.reference_url = parsed.data.reference_url;

    let updateQuery = (supabaseAdmin.from('inspirations') as any)
      .update(updateData)
      .eq('id', id)
      .eq('user_id', ctx.userId);

    if (ctx.teamId) {
      updateQuery = updateQuery.eq('team_id', ctx.teamId);
    }

    const { data, error } = await updateQuery.select().single();

    if (error) {
      console.error('[API /inspirations/[id] PUT]', error);
      return NextResponse.json({ message: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('[API /inspirations/[id] PUT]', error);
    const message = error instanceof Error ? error.message : '更新灵感失败';
    return NextResponse.json({ message }, { status: 500 });
  }
}

/**
 * DELETE /api/inspirations/[id] - 删除灵感
 * Phase 2: 按 team_id 隔离
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireTeamAccess('content:delete');
    if (isErrorResponse(ctx)) return ctx;

    const { id } = await params;

    let deleteQuery = (supabaseAdmin.from('inspirations') as any)
      .delete()
      .eq('id', id)
      .eq('user_id', ctx.userId);

    if (ctx.teamId) {
      deleteQuery = deleteQuery.eq('team_id', ctx.teamId);
    }

    const { error } = await deleteQuery;

    if (error) {
      console.error('[API /inspirations/[id] DELETE]', error);
      return NextResponse.json({ message: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: '已删除' });
  } catch (error) {
    console.error('[API /inspirations/[id] DELETE]', error);
    const message = error instanceof Error ? error.message : '删除灵感失败';
    return NextResponse.json({ message }, { status: 500 });
  }
}
