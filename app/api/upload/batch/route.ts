import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { createHash } from 'crypto';
import { getStorageMode } from '@/lib/storage';
import { FILE_UPLOAD_LIMITS, ALLOWED_FILE_EXTENSIONS, ALLOWED_MIME_TYPES, BATCH_UPLOAD_CONFIG } from '@/lib/constants';
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
  
  // 文件大小限制
  if (fileSize > FILE_UPLOAD_LIMITS.MAX_FILE_SIZE) {
    throw new Error(`文件大小超过限制（最大 ${FILE_UPLOAD_LIMITS.MAX_FILE_SIZE / 1024 / 1024}MB）`);
  }

  // 验证文件名
  if (!fileName || fileName.length > FILE_UPLOAD_LIMITS.MAX_FILE_NAME_LENGTH) {
    throw new Error('文件名无效');
  }

  // 验证文件扩展名
  const ext = fileName.substring(fileName.lastIndexOf('.')).toLowerCase();
  if (!ALLOWED_FILE_EXTENSIONS.ALL.includes(ext as any)) {
    throw new Error('不支持的文件类型');
  }
  
  // 计算文件 hash
  const fileHash = createHash('sha256').update(buffer).digest('hex');

  // 判断文件类型（同时验证 MIME 类型和扩展名）
  const isImage = fileType.startsWith('image/') && ALLOWED_FILE_EXTENSIONS.IMAGE.includes(ext as any);
  const isVideo = fileType.startsWith('video/') && ALLOWED_FILE_EXTENSIONS.VIDEO.includes(ext as any);

  if (!isImage && !isVideo) {
    throw new Error('只支持图片和视频文件，且文件类型必须匹配扩展名');
  }

  // 额外验证：确保 MIME 类型在允许列表中
  if (isImage && !ALLOWED_MIME_TYPES.IMAGE.includes(fileType as any)) {
    throw new Error('不支持的图片格式');
  }
  if (isVideo && !ALLOWED_MIME_TYPES.VIDEO.includes(fileType as any)) {
    throw new Error('不支持的视频格式');
  }

  // 生成唯一文件名（使用之前验证的 ext）
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 8);
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

// 并发控制：限制同时上传的文件数量
async function uploadWithConcurrencyLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let currentIndex = 0;
  
  // 创建并发池
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (currentIndex < items.length) {
      const index = currentIndex++;
      if (index >= items.length) break;
      
      try {
        results[index] = await fn(items[index], index);
      } catch (error) {
        // 保持错误信息，但标记为失败
        results[index] = { error: error instanceof Error ? error.message : String(error) } as any;
      }
    }
  });
  
  await Promise.all(workers);
  return results;
}

// 带重试的上传函数
async function uploadFileWithRetry(
  file: File,
  index: number,
  retries = BATCH_UPLOAD_CONFIG.MAX_RETRIES
): Promise<ReturnType<typeof uploadFile>> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await uploadFile(file, index);
    } catch (error) {
      if (attempt === retries) {
        throw error;
      }
      // 等待后重试
      await new Promise(resolve => setTimeout(resolve, BATCH_UPLOAD_CONFIG.RETRY_DELAY * attempt));
      console.warn(`文件 ${file.name} 上传失败，重试 ${attempt}/${retries}...`);
    }
  }
  throw new Error('上传失败：重试次数用尽');
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ message: '没有上传文件' }, { status: 400 });
    }

    // 检查批量大小限制
    if (files.length > BATCH_UPLOAD_CONFIG.MAX_BATCH_SIZE) {
      return NextResponse.json(
        { 
          message: `批量上传文件数量超过限制（最大 ${BATCH_UPLOAD_CONFIG.MAX_BATCH_SIZE} 个）`,
          maxBatchSize: BATCH_UPLOAD_CONFIG.MAX_BATCH_SIZE
        },
        { status: 400 }
      );
    }

    // 使用并发控制上传文件
    const results = await uploadWithConcurrencyLimit(
      files,
      BATCH_UPLOAD_CONFIG.MAX_CONCURRENT_UPLOADS,
      (file, index) => uploadFileWithRetry(file, index)
    );

    // 检查是否有失败的上传
    const failedUploads = results.filter(r => r && 'error' in r);
    if (failedUploads.length > 0) {
      console.warn(`批量上传部分失败: ${failedUploads.length}/${files.length}`);
    }

    return NextResponse.json({
      success: failedUploads.length === 0,
      files: results,
      stats: {
        total: files.length,
        success: results.length - failedUploads.length,
        failed: failedUploads.length,
      },
    });
  } catch (error) {
    console.error('批量上传文件失败:', error);
    const message = error instanceof Error ? error.message : '上传文件失败';
    return NextResponse.json({ message }, { status: 500 });
  }
}

