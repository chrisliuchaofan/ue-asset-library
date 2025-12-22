import { NextResponse } from 'next/server';
import { AssetUpdateSchema } from '@/data/manifest.schema';
import { deleteAsset, getAsset, updateAsset, getAllowedTypes, updateAllowedTypes } from '@/lib/storage';
import { handleApiError } from '@/lib/error-handler';
import { z } from 'zod';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const asset = await getAsset(id);
    if (!asset) {
      return NextResponse.json({ message: '资产不存在' }, { status: 404 });
    }
    return NextResponse.json(asset);
  } catch (error) {
    return handleApiError(error, '获取资产失败');
  }
}

export async function PUT(request: Request, { params }: RouteContext) {
  const { id } = await params;
  try {
    const json = await request.json();
    
    // 先获取允许的类型列表
    let allowedTypes = await getAllowedTypes();
    
    // 如果类型不在允许列表中，自动添加到允许列表（支持新增类型）
    if (json.type !== undefined && json.type !== null && json.type.trim() && !allowedTypes.includes(json.type.trim())) {
      const newType = json.type.trim();
      // 添加到允许列表
      allowedTypes = [...allowedTypes, newType];
      await updateAllowedTypes(allowedTypes);
    }
    
    // 如果类型在 allowedTypes 中但不在 DEFAULT_ASSET_TYPES 中，临时替换为"其他"以通过枚举验证
    const originalType = json.type;
    const needsTypeFix = originalType !== undefined && 
      allowedTypes.includes(originalType) && 
      !['角色', '场景', '动画', '特效', '材质', '蓝图', 'UI', '合成', '音频', '其他'].includes(originalType);
    
    if (needsTypeFix) {
      json.type = '其他'; // 临时使用默认类型以通过枚举验证
    }
    
    const parsed = AssetUpdateSchema.safeParse({ ...json, id });
    
    if (!parsed.success) {
      return NextResponse.json(
        { message: '参数验证失败', errors: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // 如果临时替换了类型，恢复原始类型后再传给 updateAsset
    if (needsTypeFix) {
      parsed.data.type = originalType as any;
    }

    const asset = await updateAsset(id, parsed.data);
    return NextResponse.json(asset);
  } catch (error) {
    return handleApiError(error, '更新资产失败');
  }
}

export async function DELETE(_: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    await deleteAsset(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, '删除资产失败或资产不存在');
  }
}


