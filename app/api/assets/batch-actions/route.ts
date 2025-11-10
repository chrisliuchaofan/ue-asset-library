import { NextResponse } from 'next/server';
import { deleteAsset, listAssets, updateAsset } from '@/lib/storage';
import type { Asset } from '@/data/manifest.schema';

type BatchAction = 'add-tags' | 'update-type' | 'update-version' | 'delete';

interface BatchActionRequest {
  assetIds: string[];
  action: BatchAction;
  payload?: {
    tags?: string[];
    type?: string;
    engineVersion?: string;
  };
}

export async function POST(request: Request) {
  try {
    const json = (await request.json()) as BatchActionRequest;
    const { assetIds, action, payload } = json;

    if (!Array.isArray(assetIds) || assetIds.length === 0) {
      return NextResponse.json(
        { message: '参数错误：assetIds 必须是非空数组' },
        { status: 400 }
      );
    }

    const trimmedAction = action;
    if (!['add-tags', 'update-type', 'update-version', 'delete'].includes(trimmedAction)) {
      return NextResponse.json(
        { message: '参数错误：不支持的批量操作类型' },
        { status: 400 }
      );
    }

    const assets = await listAssets();
    const errors: string[] = [];
    let processed = 0;

    if (trimmedAction === 'delete') {
      for (const assetId of assetIds) {
        try {
          await deleteAsset(assetId);
          processed++;
        } catch (error) {
          errors.push(`删除资产 ${assetId} 失败：${error instanceof Error ? error.message : '未知错误'}`);
        }
      }

      return NextResponse.json({
        message: `已删除 ${processed} 个资产`,
        processed,
        errors: errors.length > 0 ? errors : undefined,
      });
    }

    if (trimmedAction === 'add-tags') {
      const tags = payload?.tags?.map((tag) => tag.trim()).filter(Boolean);
      if (!tags || tags.length === 0) {
        return NextResponse.json(
          { message: '参数错误：tags 必须是非空数组' },
          { status: 400 }
        );
      }

      for (const assetId of assetIds) {
        const asset = assets.find((a) => a.id === assetId);
        if (!asset) {
          errors.push(`资产 ${assetId} 不存在`);
          continue;
        }

        const nextTags = Array.from(new Set([...asset.tags, ...tags]));

        try {
          await updateAsset(asset.id, { id: asset.id, tags: nextTags });
          processed++;
        } catch (error) {
          errors.push(`更新资产 ${asset.name} 标签失败：${error instanceof Error ? error.message : '未知错误'}`);
        }
      }

      return NextResponse.json({
        message: `已为 ${processed} 个资产添加标签`,
        processed,
        errors: errors.length > 0 ? errors : undefined,
      });
    }

    if (trimmedAction === 'update-type') {
      const type = payload?.type?.trim();
      if (!type) {
        return NextResponse.json(
          { message: '参数错误：type 不能为空' },
          { status: 400 }
        );
      }

      for (const assetId of assetIds) {
        const asset = assets.find((a) => a.id === assetId);
        if (!asset) {
          errors.push(`资产 ${assetId} 不存在`);
          continue;
        }

        try {
          await updateAsset(asset.id, { id: asset.id, type: type as Asset['type'] });
          processed++;
        } catch (error) {
          errors.push(`更新资产 ${asset.name} 类型失败：${error instanceof Error ? error.message : '未知错误'}`);
        }
      }

      return NextResponse.json({
        message: `已更新 ${processed} 个资产的类型`,
        processed,
        errors: errors.length > 0 ? errors : undefined,
      });
    }

    if (trimmedAction === 'update-version') {
      const engineVersion = payload?.engineVersion?.trim();
      if (!engineVersion) {
        return NextResponse.json(
          { message: '参数错误：engineVersion 不能为空' },
          { status: 400 }
        );
      }

      for (const assetId of assetIds) {
        const asset = assets.find((a) => a.id === assetId);
        if (!asset) {
          errors.push(`资产 ${assetId} 不存在`);
          continue;
        }

        try {
          await updateAsset(asset.id, { id: asset.id, engineVersion });
          processed++;
        } catch (error) {
          errors.push(`更新资产 ${asset.name} 版本失败：${error instanceof Error ? error.message : '未知错误'}`);
        }
      }

      return NextResponse.json({
        message: `已更新 ${processed} 个资产的版本`,
        processed,
        errors: errors.length > 0 ? errors : undefined,
      });
    }

    return NextResponse.json(
      { message: '未执行任何操作' },
      { status: 400 }
    );
  } catch (error) {
    console.error('批量操作失败', error);
    const message = error instanceof Error ? error.message : '批量操作失败';
    return NextResponse.json({ message }, { status: 500 });
  }
}
