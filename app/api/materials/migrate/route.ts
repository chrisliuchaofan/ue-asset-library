/**
 * POST /api/materials/migrate
 *
 * 数据迁移端点：将 JSON/OSS 中的现有素材数据导入到 Supabase materials 表。
 * 使用 upsert 避免重复导入。
 *
 * 仅供管理员在迁移期间使用，生产环境建议关闭或添加鉴权保护。
 */

import { NextResponse } from 'next/server';
import { getStorageMode, getOSSClient } from '@/lib/storage';
import { MaterialsManifestSchema, MaterialSchema, type Material } from '@/data/material.schema';
import { dbBatchInsertMaterials, isMaterialsTableAvailable } from '@/lib/materials-db';
import { promises as fs } from 'fs';
import { join } from 'path';

export async function POST() {
  const start = Date.now();

  try {
    // 1. 检查 Supabase materials 表是否可用
    const tableAvailable = await isMaterialsTableAvailable();
    if (!tableAvailable) {
      return NextResponse.json(
        { message: 'Supabase materials 表不存在或不可访问。请先运行迁移 SQL。' },
        { status: 503 }
      );
    }

    // 2. 从文件/OSS 读取现有素材
    let materials: Material[] = [];
    const storageMode = getStorageMode();

    if (storageMode === 'oss') {
      try {
        const client = getOSSClient();
        const result = await client.get('materials.json');
        const data = JSON.parse(result.content.toString('utf-8'));
        materials = parseMaterials(data);
      } catch (error: any) {
        if (error?.code === 'NoSuchKey' || error?.status === 404) {
          return NextResponse.json({
            message: 'OSS 中未找到 materials.json 文件',
            migrated: 0,
          });
        }
        throw error;
      }
    } else {
      const materialsPath = join(process.cwd(), 'data', 'materials.json');
      try {
        const file = await fs.readFile(materialsPath, 'utf-8');
        const data = JSON.parse(file);
        materials = parseMaterials(data);
      } catch (error: any) {
        if (error?.code === 'ENOENT') {
          return NextResponse.json({
            message: '本地 materials.json 文件不存在',
            migrated: 0,
          });
        }
        throw error;
      }
    }

    if (materials.length === 0) {
      return NextResponse.json({
        message: '没有需要迁移的素材数据',
        source: storageMode,
        migrated: 0,
      });
    }

    // 3. 批量插入到 Supabase
    const insertedCount = await dbBatchInsertMaterials(materials);

    const duration = Date.now() - start;
    return NextResponse.json({
      message: `迁移完成`,
      source: storageMode,
      total: materials.length,
      migrated: insertedCount,
      durationMs: duration,
    });
  } catch (error) {
    console.error('[MaterialsMigrate] 迁移失败:', error);
    const message = error instanceof Error ? error.message : '迁移失败';
    return NextResponse.json({ message }, { status: 500 });
  }
}

function parseMaterials(data: any): Material[] {
  try {
    if (data && Array.isArray(data.materials)) {
      data.materials = data.materials.map((m: any) => {
        if (!m.project) {
          return { ...m, project: '项目A' };
        }
        return m;
      });
    }
    const validated = MaterialsManifestSchema.parse(data);
    return validated.materials;
  } catch {
    if (data && Array.isArray(data.materials)) {
      return data.materials
        .map((m: any) => (!m.project ? { ...m, project: '项目A' } : m))
        .filter((m: any) => {
          try {
            MaterialSchema.parse(m);
            return true;
          } catch {
            return false;
          }
        });
    }
    return [];
  }
}
