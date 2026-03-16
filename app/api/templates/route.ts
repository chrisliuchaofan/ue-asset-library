/**
 * GET /api/templates — 获取模版列表
 * POST /api/templates — 创建新模版
 */

import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || undefined;
    const limit = searchParams.get('limit') ? Number(searchParams.get('limit')) : undefined;

    const { dbGetTemplates } = await import('@/lib/templates/templates-db');
    const templates = await dbGetTemplates({ status, limit });
    return NextResponse.json({ templates });
  } catch (error) {
    console.error('[TemplatesAPI] 获取模版列表失败:', error);
    return NextResponse.json({ templates: [], error: '获取模版列表失败' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { template, options } = body;

    if (!template || !template.name || !template.structure) {
      return NextResponse.json({ message: '模版数据不完整，需要 name 和 structure' }, { status: 400 });
    }

    const { dbCreateTemplate } = await import('@/lib/templates/templates-db');
    const saved = await dbCreateTemplate(template, options);
    return NextResponse.json(saved, { status: 201 });
  } catch (error) {
    console.error('[TemplatesAPI] 创建模版失败:', error);
    const message = error instanceof Error ? error.message : '创建模版失败';
    return NextResponse.json({ message }, { status: 500 });
  }
}
