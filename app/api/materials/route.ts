import { NextResponse } from 'next/server';
import { MaterialCreateSchema, type Material } from '@/data/material.schema';
import { createMaterial, getAllMaterials, getMaterialsSummary } from '@/lib/materials-data';
import { z } from 'zod';

export async function GET(request: Request) {
  const start = Date.now();
  try {
    // 解析查询参数
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '10', 10);

    // 使用真实数据源
    const allMaterials = await getAllMaterials();

    // 简单分页处理（暂时返回全部，后续可以优化）
    // 如果 pageSize 为 -1 或很大，返回全部数据
    let materials: Material[];
    if (pageSize <= 0 || pageSize >= 1000) {
      materials = allMaterials;
    } else {
      const startIndex = (page - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      materials = allMaterials.slice(startIndex, endIndex);
    }

    const duration = Date.now() - start;
    const response = NextResponse.json({
      materials,
      total: allMaterials.length,
      page,
      pageSize: pageSize > 0 && pageSize < 1000 ? pageSize : allMaterials.length,
      totalPages: pageSize > 0 && pageSize < 1000 ? Math.ceil(allMaterials.length / pageSize) : 1,
    });
    response.headers.set('X-Materials-Total', duration.toString());
    return response;
  } catch (error) {
    console.error('获取素材列表失败', error);
    const message = error instanceof Error ? error.message : '获取素材列表失败';
    const response = NextResponse.json({ message, materials: [] }, { status: 500 });
    response.headers.set('X-Materials-Error', Date.now().toString());
    return response;
  }
}

export async function POST(request: Request) {
  try {
    const json = await request.json();
    
    const parsed = MaterialCreateSchema.safeParse(json);
    
    if (!parsed.success) {
      return NextResponse.json(
        {
          message: '参数验证失败',
          errors: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const material = await createMaterial({
      name: parsed.data.name,
      type: parsed.data.type,
      project: parsed.data.project,
      tag: parsed.data.tag,
      quality: parsed.data.quality,
      thumbnail: parsed.data.thumbnail,
      src: parsed.data.src,
      gallery: parsed.data.gallery,
      filesize: parsed.data.filesize,
      fileSize: parsed.data.fileSize, // 统一命名：文件大小（字节数）
      hash: parsed.data.hash, // 文件内容的 SHA256 哈希值，用于重复检测
      width: parsed.data.width,
      height: parsed.data.height,
      duration: parsed.data.duration,
    });
    return NextResponse.json(material, { status: 201 });
  } catch (error) {
    console.error('创建素材失败', error);
    const message =
      error instanceof Error ? error.message : '创建素材失败';
    return NextResponse.json({ message }, { status: 500 });
  }
}

