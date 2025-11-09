import { NextResponse } from 'next/server';
import { MaterialUpdateSchema } from '@/data/material.schema';
import { getMaterialById, updateMaterial, deleteMaterial } from '@/lib/materials-data';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const material = await getMaterialById(id);
    
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

    const material = await updateMaterial(id, parsed.data);
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
    const { id } = await params;
    await deleteMaterial(id);
    return NextResponse.json({ message: '删除成功' });
  } catch (error) {
    console.error('删除素材失败', error);
    const message =
      error instanceof Error ? error.message : '删除素材失败';
    return NextResponse.json({ message }, { status: 500 });
  }
}

