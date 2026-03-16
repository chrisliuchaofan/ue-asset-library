/**
 * POST /api/templates/match — 向量匹配爆款模版
 *
 * 接收创意描述文本，返回匹配度最高的模版列表。
 */

import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { text, threshold, limit } = body;

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return NextResponse.json(
        { message: '请提供创意描述文本（text 字段）' },
        { status: 400 }
      );
    }

    const { matchTemplates } = await import('@/lib/templates/template-matcher');
    const results = await matchTemplates(text.trim(), {
      threshold: threshold ?? 0.5,
      limit: limit ?? 5,
    });

    return NextResponse.json({
      matches: results,
      count: results.length,
      query: text.trim(),
    });
  } catch (error) {
    console.error('[TemplatesAPI] 模版匹配失败:', error);
    const message = error instanceof Error ? error.message : '模版匹配失败';
    return NextResponse.json({ message }, { status: 500 });
  }
}
