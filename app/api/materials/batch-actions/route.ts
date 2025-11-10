import { NextResponse } from 'next/server';
import { updateMaterial, deleteMaterial } from '@/lib/materials-data';
import { MaterialQualityEnum, MaterialTagEnum, MaterialTypeEnum, type Material } from '@/data/material.schema';

type MaterialsBatchAction = 'update-type' | 'update-tag' | 'update-quality' | 'delete';

interface BatchActionRequest {
  materialIds: string[];
  action: MaterialsBatchAction;
  payload?: {
    type?: string;
    tag?: string;
    quality?: string[];
  };
}

export async function POST(request: Request) {
  try {
    const json = (await request.json()) as BatchActionRequest;
    const { materialIds, action, payload } = json;

    if (!Array.isArray(materialIds) || materialIds.length === 0) {
      return NextResponse.json({ message: 'materialIds 不能为空' }, { status: 400 });
    }

    const validIds = new Set(materialIds);
    const errors: string[] = [];
    let processed = 0;

    if (action === 'update-type') {
      const nextType = payload?.type;
      if (!nextType || !MaterialTypeEnum.options.includes(nextType as any)) {
        return NextResponse.json({ message: '无效的素材类型' }, { status: 400 });
      }

      for (const materialId of validIds) {
        try {
          await updateMaterial(materialId, { type: nextType as Material['type'] });
          processed++;
        } catch (error) {
          errors.push(`更新素材 ${materialId} 类型失败：${error instanceof Error ? error.message : '未知错误'}`);
        }
      }

      return NextResponse.json({
        message: `已更新 ${processed} 个素材的类型`,
        processed,
        errors: errors.length > 0 ? errors : undefined,
      });
    }

    if (action === 'update-tag') {
      const nextTag = payload?.tag;
      if (!nextTag || !MaterialTagEnum.options.includes(nextTag as any)) {
        return NextResponse.json({ message: '无效的素材标签' }, { status: 400 });
      }

      for (const materialId of validIds) {
        try {
          await updateMaterial(materialId, { tag: nextTag as Material['tag'] });
          processed++;
        } catch (error) {
          errors.push(`更新素材 ${materialId} 标签失败：${error instanceof Error ? error.message : '未知错误'}`);
        }
      }

      return NextResponse.json({
        message: `已更新 ${processed} 个素材的标签`,
        processed,
        errors: errors.length > 0 ? errors : undefined,
      });
    }

    if (action === 'update-quality') {
      const nextQuality = payload?.quality;
      if (!Array.isArray(nextQuality) || nextQuality.length === 0) {
        return NextResponse.json({ message: '质量列表不能为空' }, { status: 400 });
      }

      const dedupedQuality = Array.from(new Set(nextQuality)).filter((item) =>
        MaterialQualityEnum.options.includes(item as any)
      ) as Material['quality'];

      if (dedupedQuality.length === 0) {
        return NextResponse.json({ message: '无效的质量参数' }, { status: 400 });
      }

      for (const materialId of validIds) {
        try {
          await updateMaterial(materialId, { quality: dedupedQuality });
          processed++;
        } catch (error) {
          errors.push(`更新素材 ${materialId} 质量失败：${error instanceof Error ? error.message : '未知错误'}`);
        }
      }

      return NextResponse.json({
        message: `已更新 ${processed} 个素材的质量`,
        processed,
        errors: errors.length > 0 ? errors : undefined,
      });
    }

    if (action === 'delete') {
      for (const materialId of validIds) {
        try {
          await deleteMaterial(materialId);
          processed++;
        } catch (error) {
          errors.push(`删除素材 ${materialId} 失败：${error instanceof Error ? error.message : '未知错误'}`);
        }
      }

      return NextResponse.json({
        message: `已删除 ${processed} 个素材`,
        processed,
        errors: errors.length > 0 ? errors : undefined,
      });
    }

    return NextResponse.json({ message: '不支持的操作类型' }, { status: 400 });
  } catch (error) {
    console.error('素材批量操作失败', error);
    const message = error instanceof Error ? error.message : '批量操作失败';
    return NextResponse.json({ message }, { status: 500 });
  }
}
