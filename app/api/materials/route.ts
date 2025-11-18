import { NextResponse } from 'next/server';
import { MaterialCreateSchema, type Material } from '@/data/material.schema';
import { createMaterial, getAllMaterials, getMaterialsSummary } from '@/lib/materials-data';
import { z } from 'zod';

// Mock 素材数据
const MOCK_MATERIALS: Material[] = [
  {
    id: 'mock-1',
    name: 'UE视频素材_爆款案例',
    type: 'UE视频',
    project: '项目A',
    tag: '爆款',
    quality: ['高品质', '常规'],
    thumbnail: 'https://picsum.photos/400/300?random=1',
    src: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    gallery: [
      'https://picsum.photos/800/600?random=1',
      'https://picsum.photos/800/600?random=2',
    ],
    width: 1920,
    height: 1080,
    duration: 120,
    fileSize: 15728640,
    recommended: true,
    createdAt: Date.now() - 86400000 * 7,
    updatedAt: Date.now() - 86400000 * 1,
  },
  {
    id: 'mock-2',
    name: 'AE视频素材_优质内容',
    type: 'AE视频',
    project: '项目B',
    tag: '优质',
    quality: ['高品质'],
    thumbnail: 'https://picsum.photos/400/300?random=2',
    src: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    gallery: ['https://picsum.photos/800/600?random=3'],
    width: 1280,
    height: 720,
    duration: 90,
    fileSize: 10485760,
    recommended: false,
    createdAt: Date.now() - 86400000 * 5,
    updatedAt: Date.now() - 86400000 * 2,
  },
  {
    id: 'mock-3',
    name: '混剪素材_达标作品',
    type: '混剪',
    project: '项目A',
    tag: '达标',
    quality: ['常规', '迭代'],
    thumbnail: 'https://picsum.photos/400/300?random=3',
    src: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    width: 1920,
    height: 1080,
    duration: 60,
    fileSize: 8388608,
    createdAt: Date.now() - 86400000 * 3,
    updatedAt: Date.now() - 86400000 * 1,
  },
  {
    id: 'mock-4',
    name: 'AI视频素材_创新案例',
    type: 'AI视频',
    project: '项目C',
    tag: '爆款',
    quality: ['高品质'],
    thumbnail: 'https://picsum.photos/400/300?random=4',
    src: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    gallery: [
      'https://picsum.photos/800/600?random=4',
      'https://picsum.photos/800/600?random=5',
      'https://picsum.photos/800/600?random=6',
    ],
    width: 1920,
    height: 1080,
    duration: 150,
    fileSize: 20971520,
    recommended: true,
    createdAt: Date.now() - 86400000 * 10,
    updatedAt: Date.now() - 86400000 * 3,
  },
  {
    id: 'mock-5',
    name: '图片素材_风景图',
    type: '图片',
    project: '项目B',
    tag: '优质',
    quality: ['高品质', '常规'],
    thumbnail: 'https://picsum.photos/400/300?random=5',
    src: 'https://picsum.photos/1920/1080?random=5',
    gallery: [
      'https://picsum.photos/1920/1080?random=5',
      'https://picsum.photos/1920/1080?random=6',
    ],
    width: 1920,
    height: 1080,
    fileSize: 3145728,
    recommended: false,
    createdAt: Date.now() - 86400000 * 6,
    updatedAt: Date.now() - 86400000 * 2,
  },
  {
    id: 'mock-6',
    name: 'UE视频素材_场景展示',
    type: 'UE视频',
    project: '项目A',
    tag: '达标',
    quality: ['常规'],
    thumbnail: 'https://picsum.photos/400/300?random=6',
    src: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
    width: 1280,
    height: 720,
    duration: 45,
    fileSize: 5242880,
    createdAt: Date.now() - 86400000 * 4,
    updatedAt: Date.now() - 86400000 * 1,
  },
  {
    id: 'mock-7',
    name: 'AE视频素材_特效展示',
    type: 'AE视频',
    project: '项目C',
    tag: '优质',
    quality: ['高品质', '迭代'],
    thumbnail: 'https://picsum.photos/400/300?random=7',
    src: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
    gallery: ['https://picsum.photos/800/600?random=7'],
    width: 1920,
    height: 1080,
    duration: 75,
    fileSize: 12582912,
    recommended: true,
    createdAt: Date.now() - 86400000 * 8,
    updatedAt: Date.now() - 86400000 * 4,
  },
  {
    id: 'mock-8',
    name: '混剪素材_精彩片段',
    type: '混剪',
    project: '项目B',
    tag: '爆款',
    quality: ['高品质'],
    thumbnail: 'https://picsum.photos/400/300?random=8',
    src: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4',
    width: 1920,
    height: 1080,
    duration: 30,
    fileSize: 4194304,
    createdAt: Date.now() - 86400000 * 2,
    updatedAt: Date.now() - 86400000 * 1,
  },
];

export async function GET(request: Request) {
  const start = Date.now();
  try {
    // 解析查询参数
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '10', 10);

    // 使用 mock 数据
    const allMaterials = MOCK_MATERIALS;

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

