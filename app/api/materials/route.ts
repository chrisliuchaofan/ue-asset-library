import { NextResponse } from 'next/server';
import { MaterialCreateSchema } from '@/data/material.schema';
import { createMaterial, getAllMaterials } from '@/lib/materials-data';
import { z } from 'zod';

export async function GET() {
  try {
    const materials = await getAllMaterials();
    return NextResponse.json({ materials });
  } catch (error) {
    console.error('获取素材列表失败', error);
    const message = error instanceof Error ? error.message : '获取素材列表失败';
    return NextResponse.json({ message, materials: [] }, { status: 500 });
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
      tag: parsed.data.tag,
      quality: parsed.data.quality,
      thumbnail: parsed.data.thumbnail,
      src: parsed.data.src,
      gallery: parsed.data.gallery,
      filesize: parsed.data.filesize,
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

