import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth-config';
import { dbUpdateMaterial, dbGetMaterialById } from '@/lib/materials-db';
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
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ message: '未登录' }, { status: 401 });
    }

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
    const existing = await dbGetMaterialById(id);
    if (!existing) {
      return NextResponse.json({ message: '素材不存在' }, { status: 404 });
    }

    const updated = await dbUpdateMaterial(id, { status: parsed.data.status } as any);
    return NextResponse.json(updated);
  } catch (error) {
    console.error('[material/status] 更新失败:', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : '更新失败' },
      { status: 500 },
    );
  }
}
