import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { MaterialsManifestSchema } from '@/data/material.schema';

/**
 * 检查素材文件是否重复
 * 通过 hash 值查找已存在的素材记录
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

    // 读取素材数据
    const materialsPath = join(process.cwd(), 'data', 'materials.json');
    const materialsContent = await readFile(materialsPath, 'utf-8');
    const materialsManifest = MaterialsManifestSchema.parse(JSON.parse(materialsContent));

    // 在所有素材中查找匹配的 hash
    const allFileHashes = new Map<string, { url: string; materialId: string; materialName: string }>();

    materialsManifest.materials.forEach((material) => {
      // 检查主文件
      if (material.hash && material.hash === hash) {
        allFileHashes.set(hash, {
          url: material.src,
          materialId: material.id,
          materialName: material.name,
        });
      }
    });

    // 如果找到重复文件
    if (allFileHashes.has(hash)) {
      const existing = allFileHashes.get(hash)!;
      return NextResponse.json({
        isDuplicate: true,
        existingUrl: existing.url,
        existingMaterialId: existing.materialId,
        existingMaterialName: existing.materialName,
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










