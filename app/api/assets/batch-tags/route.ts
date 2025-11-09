
import { NextResponse } from 'next/server';
import { listAssets, updateAsset } from '@/lib/storage';

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const { assetIds, tagsToAdd } = json as {
      assetIds: string[];
      tagsToAdd: string[];
    };

    if (!Array.isArray(assetIds) || assetIds.length === 0) {
      return NextResponse.json(
        { message: '参数错误：assetIds 必须是非空数组' },
        { status: 400 }
      );
    }

    if (!Array.isArray(tagsToAdd) || tagsToAdd.length === 0) {
      return NextResponse.json(
        { message: '参数错误：tagsToAdd 必须是非空数组' },
        { status: 400 }
      );
    }

    // 获取所有资产
    const assets = await listAssets();
    let updatedCount = 0;
    const errors: string[] = [];

    // 批量更新资产
    for (const assetId of assetIds) {
      const asset = assets.find((a) => a.id === assetId);
      if (!asset) {
        errors.push(`资产 ${assetId} 不存在`);
        continue;
      }

      // 合并标签，去重
      const existingTags = new Set(asset.tags);
      tagsToAdd.forEach((tag) => existingTags.add(tag));
      const newTags = Array.from(existingTags);

      // 如果标签有变化，更新资产
      if (newTags.length !== asset.tags.length || 
          !newTags.every((tag) => asset.tags.includes(tag))) {
        try {
          await updateAsset(asset.id, { id: asset.id, tags: newTags });
          updatedCount++;
        } catch (error) {
          errors.push(`更新资产 ${asset.name} 失败: ${error instanceof Error ? error.message : '未知错误'}`);
        }
      }
    }

    return NextResponse.json({
      message: '批量添加标签完成',
      updatedCount,
      totalSelected: assetIds.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('批量添加标签失败', error);
    const message =
      error instanceof Error ? error.message : '批量添加标签失败';
    return NextResponse.json({ message }, { status: 500 });
  }
}

