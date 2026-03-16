import { NextResponse } from 'next/server';
import { requireTeamAccess, isErrorResponse } from '@/lib/team/require-team';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

/**
 * POST /api/inspirations/import — 批量导入灵感（Excel 数据）
 */
export async function POST(request: Request) {
  try {
    const ctx = await requireTeamAccess('content:create');
    if (isErrorResponse(ctx)) return ctx;

    const { rows } = await request.json();

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ message: '没有可导入的数据' }, { status: 400 });
    }

    // 限制单次最多 200 条
    const batch = rows.slice(0, 200);
    let success = 0;

    const records = batch.map((row: any) => ({
      user_id: ctx.userId,
      team_id: ctx.teamId,
      title: (row.title || '').trim() || null,
      content: (row.content || '').trim() || null,
      tags: row.tags
        ? String(row.tags).split(/[,，、]/).map((t: string) => t.trim()).filter(Boolean)
        : [],
      reference_url: (row.reference_url || '').trim() || null,
      source: 'manual',
      status: 'new',
      media_urls: [],
    }));

    // 过滤掉标题和内容都为空的
    const valid = records.filter((r: any) => r.title || r.content);

    if (valid.length === 0) {
      return NextResponse.json({ message: '所有行都为空', total: batch.length, success: 0 }, { status: 400 });
    }

    const { data, error } = await (supabaseAdmin.from('inspirations') as any)
      .insert(valid)
      .select('id');

    if (error) {
      console.error('[API /inspirations/import]', error);
      return NextResponse.json({ message: error.message, total: valid.length, success: 0 }, { status: 500 });
    }

    success = data?.length || 0;

    return NextResponse.json({
      total: valid.length,
      success,
      message: `成功导入 ${success} 条灵感`,
    });
  } catch (error) {
    console.error('[API /inspirations/import]', error);
    const message = error instanceof Error ? error.message : '导入失败';
    return NextResponse.json({ message, total: 0, success: 0 }, { status: 500 });
  }
}
