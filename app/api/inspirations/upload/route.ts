import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getOSSClient } from '@/lib/oss-client';
import { randomBytes } from 'crypto';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * POST /api/inspirations/upload - 上传媒体文件到 OSS
 * 支持图片、视频、语音
 */
export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ message: '未登录' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ message: '未提供文件' }, { status: 400 });
    }

    // 文件大小限制: 50MB
    const MAX_FILE_SIZE = 50 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { message: '文件大小不能超过 50MB' },
        { status: 400 }
      );
    }

    // 允许的文件类型
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic',
      'video/mp4', 'video/quicktime', 'video/webm',
      'audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/ogg', 'audio/wav',
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { message: `不支持的文件类型: ${file.type}` },
        { status: 400 }
      );
    }

    // 生成唯一文件名
    const ext = file.name.split('.').pop() || getExtFromMime(file.type);
    const uniqueId = randomBytes(8).toString('hex');
    const category = file.type.startsWith('audio/') ? 'voice' :
                     file.type.startsWith('video/') ? 'video' : 'image';
    const objectName = `inspirations/${category}/${Date.now()}-${uniqueId}.${ext}`;

    // 上传到 OSS
    const oss = getOSSClient();
    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await oss.put(objectName, buffer, {
      mime: file.type,
      headers: {
        'Content-Type': file.type,
        'Cache-Control': 'max-age=31536000',
      },
    });

    // 构建访问 URL
    const url = result.url || `https://${process.env.OSS_BUCKET}.${process.env.OSS_ENDPOINT}/${objectName}`;

    return NextResponse.json({
      url,
      objectName,
      size: file.size,
      type: file.type,
      category,
    }, { status: 201 });
  } catch (error) {
    console.error('[API /inspirations/upload]', error);
    const message = error instanceof Error ? error.message : '上传失败';
    return NextResponse.json({ message }, { status: 500 });
  }
}

function getExtFromMime(mime: string): string {
  const map: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'image/heic': 'heic',
    'video/mp4': 'mp4',
    'video/quicktime': 'mov',
    'video/webm': 'webm',
    'audio/webm': 'webm',
    'audio/mp4': 'm4a',
    'audio/mpeg': 'mp3',
    'audio/ogg': 'ogg',
    'audio/wav': 'wav',
  };
  return map[mime] || 'bin';
}
