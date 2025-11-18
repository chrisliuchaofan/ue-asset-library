import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { ManifestSchema } from '@/data/manifest.schema';

/**
 * 检查资产文件是否重复
 * 通过 hash 值查找已存在的资产记录
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { hash, fileSize, fileName } = body;

    // 验证必需参数
    if (!hash || typeof hash !== 'string') {
      return NextResponse.json(
        { message: '缺少 hash 参数' },
        { status: 400 }
      );
    }

    // 读取资产数据
    const manifestPath = join(process.cwd(), 'data', 'manifest.json');
    const manifestContent = await readFile(manifestPath, 'utf-8');
    const manifest = ManifestSchema.parse(JSON.parse(manifestContent));

    // 在所有资产中查找匹配的 hash
    // 检查主文件（src）和缩略图（thumbnail）以及画廊文件（gallery）
    const allFileHashes = new Map<string, { url: string; assetId: string; assetName: string }>();

    manifest.assets.forEach((asset) => {
      // 检查主文件
      if (asset.hash && asset.hash === hash) {
        allFileHashes.set(hash, {
          url: asset.src,
          assetId: asset.id,
          assetName: asset.name,
        });
      }

      // 检查缩略图（如果缩略图有独立的 hash，这里需要扩展）
      // 目前先只检查主文件的 hash

      // 检查画廊文件（如果画廊文件有独立的 hash，这里需要扩展）
      // 目前先只检查主文件的 hash
    });

    // 如果找到重复文件
    if (allFileHashes.has(hash)) {
      const existing = allFileHashes.get(hash)!;
      return NextResponse.json({
        isDuplicate: true,
        existingUrl: existing.url,
        existingAssetId: existing.assetId,
        existingAssetName: existing.assetName,
        message: '已检测到相同内容的文件',
      });
    }

    // 没有找到重复文件
    return NextResponse.json({
      isDuplicate: false,
      message: '文件未重复，可以上传',
    });
  } catch (error) {
    console.error('检查重复文件失败:', error);
    const message = error instanceof Error ? error.message : '检查重复文件失败';
    return NextResponse.json({ message }, { status: 500 });
  }
}










