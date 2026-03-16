/**
 * GET /api/studio/scripts — 获取脚本列表
 * POST /api/studio/scripts — 保存新脚本
 */

import { NextResponse } from 'next/server';
import type { Script } from '@/lib/studio/types';

export async function GET() {
  try {
    const { dbGetScripts } = await import('@/lib/studio/scripts-db');
    const scripts = await dbGetScripts();
    return NextResponse.json({ scripts });
  } catch (error) {
    console.error('[ScriptsAPI] 获取脚本列表失败:', error);
    // Supabase 不可用时返回空列表，前端回退到 localStorage
    return NextResponse.json({ scripts: [], fallback: true });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const script: Script = body.script;
    const options = body.options ?? {};

    if (!script || !script.title || !script.scenes) {
      return NextResponse.json({ message: '脚本数据不完整' }, { status: 400 });
    }

    const { dbCreateScript } = await import('@/lib/studio/scripts-db');
    const saved = await dbCreateScript(script, options);
    return NextResponse.json(saved, { status: 201 });
  } catch (error) {
    console.error('[ScriptsAPI] 保存脚本失败:', error);
    const message = error instanceof Error ? error.message : '保存脚本失败';
    return NextResponse.json({ message }, { status: 500 });
  }
}
