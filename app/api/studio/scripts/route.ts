/**
 * GET /api/studio/scripts — 获取脚本列表
 * POST /api/studio/scripts — 保存新脚本
 */

import { NextResponse } from 'next/server';
import type { Script } from '@/lib/studio/types';
import { requireTeamAccess, isErrorResponse } from '@/lib/team/require-team';

export async function GET() {
  try {
    const ctx = await requireTeamAccess('content:read');
    if (isErrorResponse(ctx)) return ctx;

    const { dbGetScripts } = await import('@/lib/studio/scripts-db');
    const scripts = await dbGetScripts({ teamId: ctx.teamId });
    return NextResponse.json({ scripts });
  } catch (error) {
    console.error('[ScriptsAPI] 获取脚本列表失败:', error);
    // Supabase 不可用时返回空列表，前端回退到 localStorage
    return NextResponse.json({ scripts: [], fallback: true });
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await requireTeamAccess('content:create');
    if (isErrorResponse(ctx)) return ctx;

    const body = await request.json();
    const script: Script = body.script;
    const options = body.options ?? {};

    if (!script || !script.title || !script.scenes) {
      return NextResponse.json({ message: '脚本数据不完整' }, { status: 400 });
    }

    const { dbCreateScript } = await import('@/lib/studio/scripts-db');
    const saved = await dbCreateScript(script, {
      ...options,
      teamId: ctx.teamId,
      userId: ctx.userId,
    });
    return NextResponse.json(saved, { status: 201 });
  } catch (error) {
    console.error('[ScriptsAPI] 保存脚本失败:', error);
    const message = error instanceof Error ? error.message : '保存脚本失败';
    return NextResponse.json({ message }, { status: 500 });
  }
}
