import { NextResponse } from 'next/server';
import { AssetCreateSchema } from '@/data/manifest.schema';
import { createAsset, getStorageMode, listAssets } from '@/lib/storage';

export async function GET() {
  const assets = await listAssets();
  return NextResponse.json({ assets });
}

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = AssetCreateSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        {
          message: '参数验证失败',
          errors: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const asset = await createAsset(parsed.data);
    return NextResponse.json(asset, { status: 201 });
  } catch (error) {
    console.error('创建资产失败', error);
    const message =
      error instanceof Error ? error.message : '创建资产失败';
    return NextResponse.json({ message }, { status: 500 });
  }
}


