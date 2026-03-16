/**
 * GET /api/templates/:id — 获取模版详情
 * PUT /api/templates/:id — 更新模版
 * DELETE /api/templates/:id — 删除模版
 */

import { NextResponse } from 'next/server';

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, props: Params) {
  try {
    const { id } = await props.params;
    const { dbGetTemplateById } = await import('@/lib/templates/templates-db');
    const template = await dbGetTemplateById(id);

    if (!template) {
      return NextResponse.json({ message: '模版不存在' }, { status: 404 });
    }

    return NextResponse.json(template);
  } catch (error) {
    console.error('[TemplatesAPI] 获取模版详情失败:', error);
    const message = error instanceof Error ? error.message : '获取模版详情失败';
    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function PUT(request: Request, props: Params) {
  try {
    const { id } = await props.params;
    const body = await request.json();

    if (!body || Object.keys(body).length === 0) {
      return NextResponse.json({ message: '更新数据不能为空' }, { status: 400 });
    }

    const { dbUpdateTemplate } = await import('@/lib/templates/templates-db');
    const updated = await dbUpdateTemplate(id, body);
    return NextResponse.json(updated);
  } catch (error) {
    console.error('[TemplatesAPI] 更新模版失败:', error);
    const message = error instanceof Error ? error.message : '更新模版失败';
    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function DELETE(request: Request, props: Params) {
  try {
    const { id } = await props.params;
    const { dbDeleteTemplate } = await import('@/lib/templates/templates-db');
    await dbDeleteTemplate(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[TemplatesAPI] 删除模版失败:', error);
    const message = error instanceof Error ? error.message : '删除模版失败';
    return NextResponse.json({ message }, { status: 500 });
  }
}
