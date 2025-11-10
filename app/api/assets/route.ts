import { NextResponse } from 'next/server';
import { AssetCreateSchema } from '@/data/manifest.schema';
import { createAsset, listAssets, getAllowedTypes, updateAllowedTypes } from '@/lib/storage';
import { z } from 'zod';

export async function GET() {
  try {
    const assets = await listAssets();
    return NextResponse.json({ assets });
  } catch (error) {
    console.error('获取资产列表失败', error);
    const message = error instanceof Error ? error.message : '获取资产列表失败';
    return NextResponse.json({ message, assets: [] }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const json = await request.json();
    
    // 先获取允许的类型列表
    let allowedTypes = await getAllowedTypes();
    
    // 如果类型不在允许列表中，自动添加到允许列表（支持新增类型）
    if (json.type && json.type.trim() && !allowedTypes.includes(json.type.trim())) {
      const newType = json.type.trim();
      // 添加到允许列表
      allowedTypes = [...allowedTypes, newType];
      await updateAllowedTypes(allowedTypes);
    }
    
    // 如果类型在 allowedTypes 中但不在 DEFAULT_ASSET_TYPES 中，临时替换为"其他"以通过枚举验证
    const originalType = json.type;
    const needsTypeFix = allowedTypes.includes(originalType) && 
      !['角色', '场景', '动画', '特效', '材质', '蓝图', 'UI', '合成', '音频', '其他'].includes(originalType);
    
    if (needsTypeFix) {
      json.type = '其他'; // 临时使用默认类型以通过枚举验证
    }
    
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

    // 如果临时替换了类型，恢复原始类型后再传给 createAsset
    if (needsTypeFix) {
      parsed.data.type = originalType as any;
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


