import { NextResponse } from 'next/server';
import { InspirationCreateSchema } from '@/data/inspiration.schema';
import { requireTeamAccess, isErrorResponse } from '@/lib/team/require-team';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

/**
 * GET /api/inspirations - 获取灵感列表
 * 支持分页、标签筛选、搜索
 * Phase 2: 按 team_id 隔离数据
 */
export async function GET(request: Request) {
  try {
    const ctx = await requireTeamAccess('content:read');
    if (isErrorResponse(ctx)) return ctx;

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);
    const tag = searchParams.get('tag');
    const search = searchParams.get('search');
    const status = searchParams.get('status');

    let query = (supabaseAdmin.from('inspirations') as any)
      .select('*', { count: 'exact' })
      .eq('user_id', ctx.userId)
      .order('created_at', { ascending: false });

    // 团队隔离：如果有 team_id 则按团队查询
    if (ctx.teamId) {
      query = query.eq('team_id', ctx.teamId);
    }

    // 状态筛选
    if (status) {
      query = query.eq('status', status);
    }

    // 标签筛选
    if (tag) {
      query = query.contains('tags', [tag]);
    }

    // 搜索（标题和内容）
    if (search) {
      query = query.or(`title.ilike.%${search}%,content.ilike.%${search}%`);
    }

    // 分页
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      console.error('[API /inspirations GET]', error);
      return NextResponse.json({ message: error.message }, { status: 500 });
    }

    return NextResponse.json({
      inspirations: data || [],
      total: count || 0,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize),
    });
  } catch (error) {
    console.error('[API /inspirations GET]', error);
    const message = error instanceof Error ? error.message : '获取灵感列表失败';
    return NextResponse.json({ message }, { status: 500 });
  }
}

/**
 * POST /api/inspirations - 创建灵感
 * Phase 2: 自动关联 team_id
 */
export async function POST(request: Request) {
  try {
    const ctx = await requireTeamAccess('content:create');
    if (isErrorResponse(ctx)) return ctx;

    const json = await request.json();

    const parsed = InspirationCreateSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { message: '参数验证失败', errors: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { data, error } = await (supabaseAdmin.from('inspirations') as any)
      .insert({
        user_id: ctx.userId,
        team_id: ctx.teamId,
        title: parsed.data.title || null,
        content: parsed.data.content || null,
        media_urls: parsed.data.media_urls,
        voice_url: parsed.data.voice_url || null,
        tags: parsed.data.tags,
        source: parsed.data.source,
        status: parsed.data.status || 'new',
        reference_url: parsed.data.reference_url || null,
      })
      .select()
      .single();

    if (error) {
      console.error('[API /inspirations POST]', error);
      return NextResponse.json({ message: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('[API /inspirations POST]', error);
    const message = error instanceof Error ? error.message : '创建灵感失败';
    return NextResponse.json({ message }, { status: 500 });
  }
}
