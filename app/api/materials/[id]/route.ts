import { NextResponse } from 'next/server';
import { MaterialUpdateSchema } from '@/data/material.schema';
import { getMaterialById, updateMaterial, deleteMaterial } from '@/lib/materials-data';
import { requireTeamAccess, isErrorResponse } from '@/lib/team/require-team';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireTeamAccess('content:read');
    if (isErrorResponse(ctx)) return ctx;

    const { id } = await params;
    const material = await getMaterialById(id, { teamId: ctx.teamId });
    
    if (!material) {
      return NextResponse.json({ message: '素材不存在' }, { status: 404 });
    }
    
    return NextResponse.json(material);
  } catch (error) {
    console.error('获取素材失败', error);
    const message = error instanceof Error ? error.message : '获取素材失败';
    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireTeamAccess('content:update');
    if (isErrorResponse(ctx)) return ctx;

    const { id } = await params;
    const json = await request.json();
    
    const parsed = MaterialUpdateSchema.safeParse({ ...json, id });
    
    if (!parsed.success) {
      return NextResponse.json(
        {
          message: '参数验证失败',
          errors: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const existing = await getMaterialById(id, { teamId: ctx.teamId, includeGlobal: false });
    if (!existing) {
      return NextResponse.json({ message: '素材不存在' }, { status: 404 });
    }

    const material = await updateMaterial(id, parsed.data, { teamId: ctx.teamId });
    return NextResponse.json(material);
  } catch (error) {
    console.error('更新素材失败', error);
    const message =
      error instanceof Error ? error.message : '更新素材失败';
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
    const existing = await getMaterialById(id, { teamId: ctx.teamId, includeGlobal: false });
    if (!existing) {
      return NextResponse.json({ message: '素材不存在' }, { status: 404 });
    }

    await deleteMaterial(id, { teamId: ctx.teamId });
    return NextResponse.json({ message: '删除成功' });
  } catch (error) {
    console.error('删除素材失败', error);
    const message =
      error instanceof Error ? error.message : '删除素材失败';
    return NextResponse.json({ message }, { status: 500 });
  }
}
