import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { getStorageMode } from '@/lib/storage';
import OSS from 'ali-oss';
import sharp from 'sharp';

const STORAGE_MODE = (process.env.STORAGE_MODE as 'local' | 'oss' | undefined) ?? 'local';

function getOSSClient(): OSS {
  const bucket = process.env.OSS_BUCKET;
  const region = process.env.OSS_REGION;
  const accessKeyId = process.env.OSS_ACCESS_KEY_ID;
  const accessKeySecret = process.env.OSS_ACCESS_KEY_SECRET;
  const endpoint = process.env.OSS_ENDPOINT;

  if (!bucket || !region || !accessKeyId || !accessKeySecret) {
    throw new Error('OSS 配置不完整');
  }

  return new OSS({
    region,
    bucket,
    accessKeyId,
    accessKeySecret,
    ...(endpoint && { endpoint }),
  });
}


async function uploadFile(
  file: File,
  index: number
): Promise<{
  url: string;
  fileName: string;
  originalName: string;
  type: 'image' | 'video';
  size: number;
  width?: number;
  height?: number;
  duration?: number;
  thumbnailUrl?: string;
  hash: string;
  isDuplicate?: boolean;
  existingUrl?: string;
}> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const fileName = file.name;
  const fileType = file.type;
  const fileSize = buffer.length;
  
  // 计算文件 hash
  const fileHash = createHash('sha256').update(buffer).digest('hex');

  const isImage = fileType.startsWith('image/');
  const isVideo = fileType.startsWith('video/');

  if (!isImage && !isVideo) {
    throw new Error('只支持图片和视频文件');
  }

  // 生成唯一文件名
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 8);
  const ext = fileName.substring(fileName.lastIndexOf('.'));
  const newFileName = `${timestamp}-${randomStr}${ext}`;

  let fileUrl: string;
  let width: number | undefined;
  let height: number | undefined;
  let thumbnailUrl: string | undefined;

  if (STORAGE_MODE === 'local') {
    const uploadDir = join(process.cwd(), 'public', 'demo');
    await mkdir(uploadDir, { recursive: true });
    const filePath = join(uploadDir, newFileName);
    await writeFile(filePath, buffer);
    fileUrl = `/demo/${newFileName}`;

    if (isImage) {
      try {
        const metadata = await sharp(buffer).metadata();
        width = metadata.width;
        height = metadata.height;
      } catch (error) {
        console.warn('无法读取图片尺寸:', error);
      }
    } else if (isVideo) {
      // 视频：尝试生成缩略图
      // 注意：这里简化处理，实际可以使用 ffmpeg 或客户端提取
      // 暂时使用视频本身作为缩略图占位
    }
  } else {
    const client = getOSSClient();
    const ossPath = `assets/${newFileName}`;
    await client.put(ossPath, buffer, {
      contentType: fileType,
    });

    const cdnBase = process.env.NEXT_PUBLIC_CDN_BASE || '';
    if (cdnBase && cdnBase !== '/' && cdnBase.trim() !== '' && !cdnBase.startsWith('http')) {
      fileUrl = `${cdnBase.replace(/\/+$/, '')}/${ossPath}`;
    } else if (cdnBase && (cdnBase.startsWith('http://') || cdnBase.startsWith('https://'))) {
      fileUrl = `${cdnBase.replace(/\/+$/, '')}/${ossPath}`;
    } else {
      const bucket = process.env.OSS_BUCKET!;
      const region = process.env.OSS_REGION!.replace('oss-', '');
      fileUrl = `https://${bucket}.oss-${region}.aliyuncs.com/${ossPath}`;
    }

    if (isImage) {
      try {
        const metadata = await sharp(buffer).metadata();
        width = metadata.width;
        height = metadata.height;
      } catch (error) {
        console.warn('无法读取图片尺寸:', error);
      }
    }
  }

  return {
    url: fileUrl,
    fileName: newFileName,
    originalName: fileName,
    type: isImage ? 'image' : 'video',
    size: fileSize,
    width,
    height,
    thumbnailUrl,
    hash: fileHash,
  };
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ message: '没有上传文件' }, { status: 400 });
    }

    const results = await Promise.all(
      files.map((file, index) => uploadFile(file, index))
    );

    return NextResponse.json({
      success: true,
      files: results,
    });
  } catch (error) {
    console.error('批量上传文件失败:', error);
    const message = error instanceof Error ? error.message : '上传文件失败';
    return NextResponse.json({ message }, { status: 500 });
  }
}

