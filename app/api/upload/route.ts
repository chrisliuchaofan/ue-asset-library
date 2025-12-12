import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { createHash } from 'crypto';
import { getStorageMode } from '@/lib/storage';
import { FILE_UPLOAD_LIMITS, ALLOWED_FILE_EXTENSIONS, ALLOWED_MIME_TYPES } from '@/lib/constants';
import { getOSSClient } from '@/lib/oss-client';
import { handleApiError } from '@/lib/error-handler';
import sharp from 'sharp';

// 使用统一的存储模式判断函数，确保本地和线上行为一致
const STORAGE_MODE = getStorageMode();

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

    // 验证文件大小
    if (fileSize > FILE_UPLOAD_LIMITS.MAX_FILE_SIZE) {
      // 格式化文件大小显示（大于1GB显示为GB，否则显示为MB）
      const maxSizeMB = FILE_UPLOAD_LIMITS.MAX_FILE_SIZE / 1024 / 1024;
      const maxSizeGB = FILE_UPLOAD_LIMITS.MAX_FILE_SIZE / 1024 / 1024 / 1024;
      const sizeDisplay = maxSizeGB >= 1 
        ? `${maxSizeGB.toFixed(1)}GB` 
        : `${maxSizeMB}MB`;
      return NextResponse.json({ 
        message: `文件大小超过限制（最大 ${sizeDisplay}）` 
      }, { status: 400 });
    }

    // 验证文件名为空或过长
    if (!fileName || fileName.length > FILE_UPLOAD_LIMITS.MAX_FILE_NAME_LENGTH) {
      return NextResponse.json({ message: '文件名无效' }, { status: 400 });
    }

    // 验证文件扩展名（防止文件类型伪装）
    const ext = fileName.substring(fileName.lastIndexOf('.')).toLowerCase();
    if (!ALLOWED_FILE_EXTENSIONS.ALL.includes(ext as any)) {
      return NextResponse.json({ message: '不支持的文件类型' }, { status: 400 });
    }

    // 计算文件 hash（用于唯一性检查）
    const fileHash = createHash('sha256').update(buffer).digest('hex');

    // 判断文件类型（同时验证 MIME 类型和扩展名）
    const isImage = fileType.startsWith('image/') && ALLOWED_FILE_EXTENSIONS.IMAGE.includes(ext as any);
    const isVideo = fileType.startsWith('video/') && ALLOWED_FILE_EXTENSIONS.VIDEO.includes(ext as any);

    if (!isImage && !isVideo) {
      return NextResponse.json({ message: '只支持图片和视频文件，且文件类型必须匹配扩展名' }, { status: 400 });
    }

    // 额外验证：确保 MIME 类型在允许列表中
    if (isImage && !ALLOWED_MIME_TYPES.IMAGE.includes(fileType as any)) {
      return NextResponse.json({ message: '不支持的图片格式' }, { status: 400 });
    }
    if (isVideo && !ALLOWED_MIME_TYPES.VIDEO.includes(fileType as any)) {
      return NextResponse.json({ message: '不支持的视频格式' }, { status: 400 });
    }

    // 检查文件是否已存在（通过 hash）
    // 先检查资产库中是否存在相同 hash 的文件
    try {
      const { readFile } = await import('fs/promises');
      const { join } = await import('path');
      const { ManifestSchema } = await import('@/data/manifest.schema');
      
      const manifestPath = join(process.cwd(), 'data', 'manifest.json');
      const manifestContent = await readFile(manifestPath, 'utf-8');
      const manifest = ManifestSchema.parse(JSON.parse(manifestContent));

      // 在所有资产中查找匹配的 hash
      const existingAsset = manifest.assets.find((asset) => asset.hash === fileHash);
      
      if (existingAsset && existingAsset.src) {
        // 找到重复文件，直接返回已有文件的 URL，不实际上传
        // 获取图片尺寸（如果可能）
        let width: number | undefined;
        let height: number | undefined;
        
        if (isImage) {
          try {
            const metadata = await sharp(buffer).metadata();
            width = metadata.width;
            height = metadata.height;
          } catch (error) {
            // 图片尺寸读取失败不影响，静默处理
          }
        }

        return NextResponse.json({
          success: true,
          url: existingAsset.src,
          fileName: fileName,
          originalName: fileName,
          type: isImage ? 'image' : 'video',
          size: fileSize,
          fileSize: fileSize,
          width,
          height,
          duration: undefined, // 视频时长需要额外工具获取
          hash: fileHash,
          isDuplicate: true, // 标记为重复文件
          existingAssetName: existingAsset.name, // 已有资产名称
        });
      }
    } catch (error) {
      // 检查重复文件失败不影响上传流程，继续正常上传
      console.warn('检查重复文件失败，继续上传流程:', error);
    }

    // 生成唯一文件名（保留原始扩展名大小写）
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const fileExt = fileName.substring(fileName.lastIndexOf('.'));
    const newFileName = `${timestamp}-${randomStr}${fileExt}`;

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
          // 图片尺寸读取失败不影响上传，静默处理
          // logger.warn('无法读取图片尺寸:', error);
        }
      }
    } else {
      // OSS 模式：上传到 OSS
      const client = getOSSClient();
      const ossPath = `assets/${newFileName}`;
      await (client as any).multipartUpload(ossPath, buffer, {
        parallel: 4,
        partSize: 10 * 1024 * 1024, // 10MB 分片
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
          // 图片尺寸读取失败不影响上传，静默处理
          // logger.warn('无法读取图片尺寸:', error);
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
      fileSize: fileSize, // 统一命名：文件大小（字节数）
      width,
      height,
      duration, // 视频时长需要额外工具获取，这里暂时为 undefined
      hash: fileHash, // 返回文件 hash（SHA256），用于重复检测
    });
  } catch (error) {
    // 使用统一的错误处理
    return handleApiError(error, '上传文件失败');
  }
}

