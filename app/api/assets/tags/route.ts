import { NextResponse } from 'next/server';
import { listAssets, updateAsset } from '@/lib/storage';
import type { Asset } from '@/data/manifest.schema';

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const { mappings } = json as { mappings: Array<{ oldTag: string; newTag: string | null }> };

    if (!Array.isArray(mappings)) {
      return NextResponse.json(
        { message: '参数格式错误：mappings 必须是数组' },
        { status: 400 }
      );
    }

    // 获取所有资产
    const assets = await listAssets();
    let updatedCount = 0;

    // 批量更新资产
    for (const asset of assets) {
      let tagsChanged = false;
      const newTags = [...asset.tags];

      // 应用所有映射
      for (const mapping of mappings) {
        const { oldTag, newTag } = mapping;
        const tagIndex = newTags.indexOf(oldTag);

            if (tagIndex !== -1) {
              if (newTag === null) {
                // 删除标签
                newTags.splice(tagIndex, 1);
                tagsChanged = true;
              } else if (newTag !== oldTag) {
                // 重命名标签
                newTags[tagIndex] = newTag;
                tagsChanged = true;
              }
            }
          }

      // 如果有更改，更新资产
      if (tagsChanged) {
        // 去重
        const uniqueTags = Array.from(new Set(newTags));
        await updateAsset(asset.id, { id: asset.id, tags: uniqueTags });
        updatedCount++;
      }
    }

    return NextResponse.json({
      message: '标签更新成功',
      updatedCount,
      totalAssets: assets.length,
    });
  } catch (error) {
    console.error('批量更新标签失败', error);
    const message =
      error instanceof Error ? error.message : '批量更新标签失败';
    return NextResponse.json({ message }, { status: 500 });
  }
}

