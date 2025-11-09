import { NextResponse } from 'next/server';
import { AssetUpdateSchema } from '@/data/manifest.schema';
import { deleteAsset, getAsset, updateAsset } from '@/lib/storage';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_: Request, { params }: RouteContext) {
  const { id } = await params;
  const asset = await getAsset(id);
  if (!asset) {
    return NextResponse.json({ message: '资产不存在' }, { status: 404 });
  }
  return NextResponse.json(asset);
}

export async function PUT(request: Request, { params }: RouteContext) {
  const { id } = await params;
  try {
    const json = await request.json();
    const parsed = AssetUpdateSchema.safeParse({ ...json, id });
    if (!parsed.success) {
      return NextResponse.json(
        { message: '参数验证失败', errors: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const asset = await updateAsset(id, parsed.data);
    return NextResponse.json(asset);
  } catch (error) {
    console.error(`更新资产失败`, error);
    const message =
      error instanceof Error ? error.message : '更新资产失败';
    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: RouteContext) {
  const { id } = await params;
  try {
    await deleteAsset(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`删除资产失败`, error);
    const message =
      error instanceof Error ? error.message : '删除资产失败或资产不存在';
    return NextResponse.json({ message }, { status: 500 });
  }
}


