import { NextResponse } from 'next/server';
import { dbUpdateMaterial, dbGetMaterialById } from '@/lib/materials-db';
import { requireTeamAccess, isErrorResponse } from '@/lib/team/require-team';
import { z } from 'zod';

/**
 * PATCH /api/materials/[id]/status
 *
 * 更新素材状态：draft → reviewing → approved → published
 */

const StatusSchema = z.object({
  status: z.enum(['draft', 'reviewing', 'approved', 'published']),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireTeamAccess('content:update');
    if (isErrorResponse(ctx)) return ctx;

    const { id } = await params;
    const json = await request.json();
    const parsed = StatusSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { message: '无效的状态值', errors: parsed.error.flatten() },
        { status: 400 },
      );
    }

    // 验证素材存在
    const existing = await dbGetMaterialById(id, {
      teamId: ctx.teamId,
      includeGlobal: false,
    });
    if (!existing) {
      return NextResponse.json({ message: '素材不存在' }, { status: 404 });
    }

    const nextStatus = parsed.data.status;
    const requiresNaming = nextStatus === 'approved' || nextStatus === 'published';
    if (requiresNaming && (!existing.namingVerified || !existing.materialNaming)) {
      return NextResponse.json(
        { message: '请先完成标准命名，再标记为已通过或已投放' },
        { status: 400 },
      );
    }

    if (nextStatus === 'published' && !existing.platformName?.trim()) {
      return NextResponse.json(
        { message: '请先回填投放平台素材名，再标记为已投放' },
        { status: 400 },
      );
    }

    const updated = await dbUpdateMaterial(id, { status: nextStatus } as any, {
      teamId: ctx.teamId,
    });
    return NextResponse.json(updated);
  } catch (error) {
    console.error('[material/status] 更新失败:', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : '更新失败' },
      { status: 500 },
    );
  }
}
