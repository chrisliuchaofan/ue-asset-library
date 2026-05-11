/**
 * POST /api/templates/extract — AI 提取爆款模版
 *
 * 接收一组素材 ID，从中提取可复用的爆款模版。
 */

import { NextResponse } from 'next/server';
import { requireTeamAccess, isErrorResponse } from '@/lib/team/require-team';

export async function POST(request: Request) {
  try {
    const ctx = await requireTeamAccess('content:create');
    if (isErrorResponse(ctx)) return ctx;

    const body = await request.json();
    const { materialIds, style } = body;

    if (!materialIds || !Array.isArray(materialIds) || materialIds.length === 0) {
      return NextResponse.json(
        { message: '请提供至少一个素材 ID（materialIds 数组）' },
        { status: 400 }
      );
    }

    const uniqueMaterialIds = Array.from(new Set(materialIds.filter((id): id is string => typeof id === 'string' && id.trim().length > 0)));
    if (uniqueMaterialIds.length === 0) {
      return NextResponse.json(
        { message: '请提供至少一个有效素材 ID' },
        { status: 400 }
      );
    }

    // 1. 获取素材详情
    const { dbGetMaterialsByIds } = await import('@/lib/materials-db');
    const materials = await dbGetMaterialsByIds(uniqueMaterialIds, { teamId: ctx.teamId });

    if (materials.length === 0) {
      return NextResponse.json(
        { message: '未找到指定素材' },
        { status: 404 }
      );
    }

    if (materials.length !== uniqueMaterialIds.length) {
      return NextResponse.json(
        { message: '部分素材不存在或无权限访问，请重新选择后再提取模版' },
        { status: 404 }
      );
    }

    // 2. AI 提取模版
    const { extractTemplate } = await import('@/lib/templates/template-extractor');
    const template = await extractTemplate(materials, {
      style,
      teamId: ctx.teamId,
      userId: ctx.userId,
    });

    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    console.error('[TemplatesAPI] AI 提取模版失败:', error);
    const message = error instanceof Error ? error.message : 'AI 提取模版失败';
    return NextResponse.json({ message }, { status: 500 });
  }
}
