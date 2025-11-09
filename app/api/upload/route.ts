import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { createHash } from 'crypto';
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

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ message: '没有上传文件' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const fileName = file.name;
    const fileType = file.type;
    const fileSize = buffer.length;

    // 计算文件 hash（用于唯一性检查）
    const fileHash = createHash('sha256').update(buffer).digest('hex');

    // 判断文件类型
    const isImage = fileType.startsWith('image/');
    const isVideo = fileType.startsWith('video/');

    if (!isImage && !isVideo) {
      return NextResponse.json({ message: '只支持图片和视频文件' }, { status: 400 });
    }

    // 检查文件是否已存在（通过 hash）
    // 这里需要检查已上传的文件，暂时先上传，后续可以通过 manifest 检查

    // 生成唯一文件名
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const ext = fileName.substring(fileName.lastIndexOf('.'));
    const newFileName = `${timestamp}-${randomStr}${ext}`;

    let fileUrl: string;
    let width: number | undefined;
    let height: number | undefined;
    let duration: number | undefined;

    if (STORAGE_MODE === 'local') {
      // 本地模式：保存到 public/demo 目录
      const uploadDir = join(process.cwd(), 'public', 'demo');
      await mkdir(uploadDir, { recursive: true });
      const filePath = join(uploadDir, newFileName);
      await writeFile(filePath, buffer);
      fileUrl = `/demo/${newFileName}`;

      // 如果是图片，获取尺寸
      if (isImage) {
        try {
          const metadata = await sharp(buffer).metadata();
          width = metadata.width;
          height = metadata.height;
        } catch (error) {
          console.warn('无法读取图片尺寸:', error);
        }
      }
    } else {
      // OSS 模式：上传到 OSS
      const client = getOSSClient();
      const ossPath = `assets/${newFileName}`;
      await client.put(ossPath, buffer, {
        contentType: fileType,
      });

      // 获取 OSS 文件 URL
      // OSS 模式下，始终返回完整的可访问 URL
      const cdnBase = process.env.NEXT_PUBLIC_CDN_BASE || '';
      if (cdnBase && cdnBase !== '/' && cdnBase.trim() !== '' && !cdnBase.startsWith('http')) {
        // 如果配置了 CDN base（但不是完整 URL），使用 CDN URL
        fileUrl = `${cdnBase.replace(/\/+$/, '')}/${ossPath}`;
      } else if (cdnBase && (cdnBase.startsWith('http://') || cdnBase.startsWith('https://'))) {
        // 如果 CDN base 是完整 URL，直接使用
        fileUrl = `${cdnBase.replace(/\/+$/, '')}/${ossPath}`;
      } else {
        // 如果没有 CDN 或 CDN base 是 /，使用 OSS 外网域名（完整 URL）
        const bucket = process.env.OSS_BUCKET!;
        const region = process.env.OSS_REGION!.replace('oss-', '');
        fileUrl = `https://${bucket}.oss-${region}.aliyuncs.com/${ossPath}`;
      }

      // 如果是图片，获取尺寸
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

    return NextResponse.json({
      success: true,
      url: fileUrl,
      fileName: newFileName,
      originalName: fileName,
      type: isImage ? 'image' : 'video',
      size: fileSize,
      width,
      height,
      duration, // 视频时长需要额外工具获取，这里暂时为 undefined
      hash: fileHash, // 返回文件 hash
    });
  } catch (error) {
    console.error('上传文件失败:', error);
    let message = '上传文件失败';
    if (error instanceof Error) {
      // 将常见错误信息转换为中文
      if (error.message.includes('OSS') || error.message.includes('配置')) {
        message = 'OSS配置错误，请检查环境变量';
      } else if (error.message.includes('permission') || error.message.includes('权限')) {
        message = '没有权限上传文件，请检查OSS权限配置';
      } else if (error.message.includes('network') || error.message.includes('网络')) {
        message = '网络错误，请检查网络连接';
      } else if (error.message.includes('timeout') || error.message.includes('超时')) {
        message = '上传超时，请重试';
      } else {
        message = error.message || '上传文件失败';
      }
    }
    return NextResponse.json({ message }, { status: 500 });
  }
}

