/**
 * PUT /api/studio/scripts/[id] — 更新脚本
 * DELETE /api/studio/scripts/[id] — 删除脚本
 */

import { NextResponse } from 'next/server';
import { requireTeamAccess, isErrorResponse } from '@/lib/team/require-team';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireTeamAccess('content:update');
    if (isErrorResponse(ctx)) return ctx;

    const { id } = await params;
    const updates = await request.json();

    const { dbUpdateScript } = await import('@/lib/studio/scripts-db');
    const updated = await dbUpdateScript(id, updates, { teamId: ctx.teamId });
    return NextResponse.json(updated);
  } catch (error) {
    console.error('[ScriptsAPI] 更新脚本失败:', error);
    const message = error instanceof Error ? error.message : '更新脚本失败';
    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireTeamAccess('content:delete');
    if (isErrorResponse(ctx)) return ctx;

    const { id } = await params;

    const { dbDeleteScript } = await import('@/lib/studio/scripts-db');
    await dbDeleteScript(id, { teamId: ctx.teamId });
    return NextResponse.json({ message: '删除成功' });
  } catch (error) {
    console.error('[ScriptsAPI] 删除脚本失败:', error);
    const message = error instanceof Error ? error.message : '删除脚本失败';
    return NextResponse.json({ message }, { status: 500 });
  }
}
