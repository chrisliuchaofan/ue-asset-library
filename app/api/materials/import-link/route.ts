import { createHash } from 'crypto';
import { mkdir, writeFile } from 'fs/promises';
import { basename, extname, join } from 'path';
import { NextResponse } from 'next/server';
import sharp from 'sharp';
import { z } from 'zod';
import {
  MaterialQualityEnum,
  MaterialSourceEnum,
  MaterialTagEnum,
  MaterialTypeEnum,
  ProjectEnum,
} from '@/data/material.schema';
import {
  ALLOWED_FILE_EXTENSIONS,
  ALLOWED_MIME_TYPES,
  FILE_UPLOAD_LIMITS,
} from '@/lib/constants';
import { getSession } from '@/lib/auth';
import { LINK_MATERIAL_PLATFORM, getLinkHostname } from '@/lib/material-link';
import { createMaterial } from '@/lib/materials-data';
import { getOSSClient } from '@/lib/oss-client';
import { getAllowedProjectsForEmail, isProjectAllowed } from '@/lib/project-permissions';
import { getStorageMode } from '@/lib/storage';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

const FETCH_TIMEOUT_MS = 15_000;

const LinkImportSchema = z.object({
  url: z.string().url('请输入有效链接'),
  name: z.string().min(1, '素材名称不能为空'),
  type: MaterialTypeEnum.default('图片'),
  project: ProjectEnum,
  tag: MaterialTagEnum,
  quality: z.array(MaterialQualityEnum).min(1, '至少需要选择一个质量'),
  source: MaterialSourceEnum.default('internal'),
});

const MIME_TO_EXTENSION: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
  'image/bmp': '.bmp',
  'video/mp4': '.mp4',
  'video/webm': '.webm',
  'video/quicktime': '.mov',
  'video/x-msvideo': '.avi',
  'video/x-matroska': '.mkv',
};

type DownloadableKind = 'image' | 'video';

function normalizeContentType(value: string | null): string {
  return (value || '').split(';')[0].trim().toLowerCase();
}

function isAllowedImageExtension(ext: string): boolean {
  return (ALLOWED_FILE_EXTENSIONS.IMAGE as readonly string[]).includes(ext);
}

function isAllowedVideoExtension(ext: string): boolean {
  return (ALLOWED_FILE_EXTENSIONS.VIDEO as readonly string[]).includes(ext);
}

function getExtensionFromUrl(value: string): string {
  try {
    const pathname = new URL(value).pathname;
    return extname(decodeURIComponent(pathname)).toLowerCase();
  } catch {
    return '';
  }
}

function getDownloadableKind(contentType: string, ext: string): DownloadableKind | null {
  const isImageMime = (ALLOWED_MIME_TYPES.IMAGE as readonly string[]).includes(contentType);
  const isVideoMime = (ALLOWED_MIME_TYPES.VIDEO as readonly string[]).includes(contentType);
  const isOctetStream = contentType === 'application/octet-stream' || !contentType;

  if (isImageMime && (!ext || isAllowedImageExtension(ext))) return 'image';
  if (isVideoMime && (!ext || isAllowedVideoExtension(ext))) return 'video';
  if (isOctetStream && isAllowedImageExtension(ext)) return 'image';
  if (isOctetStream && isAllowedVideoExtension(ext)) return 'video';

  return null;
}

function getContentTypeForUpload(contentType: string, ext: string): string {
  if (contentType) return contentType;

  const matched = Object.entries(MIME_TO_EXTENSION).find(([, extension]) => extension === ext);
  return matched?.[0] || 'application/octet-stream';
}

function getFileNameFromDisposition(value: string | null): string {
  if (!value) return '';

  const encodedMatch = value.match(/filename\*=UTF-8''([^;]+)/i);
  if (encodedMatch?.[1]) {
    try {
      return decodeURIComponent(encodedMatch[1].trim().replace(/^"|"$/g, ''));
    } catch {
      return encodedMatch[1].trim().replace(/^"|"$/g, '');
    }
  }

  const plainMatch = value.match(/filename="?([^";]+)"?/i);
  return plainMatch?.[1]?.trim() || '';
}

function getFileNameFromUrl(value: string): string {
  try {
    const pathname = new URL(value).pathname;
    return decodeURIComponent(basename(pathname));
  } catch {
    return '';
  }
}

function sanitizeFileName(value: string): string {
  const cleaned = value
    .replace(/[\/\\?%*:|"<>]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();

  return cleaned.slice(0, FILE_UPLOAD_LIMITS.MAX_FILE_NAME_LENGTH) || 'online-material';
}

function resolveOriginalFileName(response: Response, finalUrl: string, contentType: string): string {
  const dispositionName = getFileNameFromDisposition(response.headers.get('content-disposition'));
  const urlName = getFileNameFromUrl(finalUrl);
  const fallbackExtension = MIME_TO_EXTENSION[contentType] || getExtensionFromUrl(finalUrl) || '.bin';
  const rawName = dispositionName || urlName || `online-material${fallbackExtension}`;
  const currentExtension = extname(rawName).toLowerCase();

  if (currentExtension) {
    return sanitizeFileName(rawName);
  }

  return sanitizeFileName(`${rawName}${fallbackExtension}`);
}

async function readResponseWithLimit(response: Response, maxBytes: number): Promise<Buffer> {
  if (!response.body) {
    const fallbackBuffer = Buffer.from(await response.arrayBuffer());
    if (fallbackBuffer.length > maxBytes) {
      throw new Error('REMOTE_FILE_TOO_LARGE');
    }
    return fallbackBuffer;
  }

  const reader = response.body.getReader();
  const chunks: Buffer[] = [];
  let total = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;

    total += value.byteLength;
    if (total > maxBytes) {
      throw new Error('REMOTE_FILE_TOO_LARGE');
    }
    chunks.push(Buffer.from(value));
  }

  return Buffer.concat(chunks, total);
}

function getPublicFileUrl(ossPath: string): string {
  const cdnBase = process.env.NEXT_PUBLIC_CDN_BASE || '';
  if (cdnBase && cdnBase !== '/' && cdnBase.trim() !== '') {
    return `${cdnBase.replace(/\/+$/, '')}/${ossPath}`;
  }

  const bucket = process.env.OSS_BUCKET!;
  const region = process.env.OSS_REGION!.replace('oss-', '');
  return `https://${bucket}.oss-${region}.aliyuncs.com/${ossPath}`;
}

async function uploadDownloadedMedia(
  buffer: Buffer,
  originalName: string,
  contentType: string,
  kind: DownloadableKind
) {
  const fileHash = createHash('sha256').update(buffer).digest('hex');
  const ext = extname(originalName).toLowerCase();

  if (!(ALLOWED_FILE_EXTENSIONS.ALL as readonly string[]).includes(ext)) {
    throw new Error('UNSUPPORTED_REMOTE_FILE');
  }
  const uploadContentType = getContentTypeForUpload(contentType, ext);

  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).slice(2, 8);
  const newFileName = `${timestamp}-${randomStr}${ext}`;
  let fileUrl: string;
  let width: number | undefined;
  let height: number | undefined;

  if (kind === 'image') {
    try {
      const metadata = await sharp(buffer).metadata();
      width = metadata.width;
      height = metadata.height;
    } catch {
      // 图片尺寸读取失败不影响上传。
    }
  }

  if (getStorageMode() === 'local') {
    const uploadDir = join(process.cwd(), 'public', 'demo');
    await mkdir(uploadDir, { recursive: true });
    await writeFile(join(uploadDir, newFileName), buffer);
    fileUrl = `/demo/${newFileName}`;
  } else {
    const ossPath = `assets/${newFileName}`;
    const client = getOSSClient();
    await (client as any).multipartUpload(ossPath, buffer, {
      parallel: 4,
      partSize: 10 * 1024 * 1024,
      contentType: uploadContentType,
    });
    fileUrl = getPublicFileUrl(ossPath);
  }

  return {
    fileUrl,
    fileSize: buffer.length,
    hash: fileHash,
    width,
    height,
  };
}

async function createLinkedMaterial(input: z.infer<typeof LinkImportSchema>, message?: string) {
  const material = await createMaterial({
    name: input.name.trim(),
    type: input.type,
    project: input.project,
    source: input.source,
    tag: input.tag,
    quality: input.quality,
    src: input.url,
    thumbnail: '',
    gallery: [],
    platform: LINK_MATERIAL_PLATFORM,
    advertiser: getLinkHostname(input.url),
  });

  return NextResponse.json(
    {
      material,
      mode: 'linked',
      message: message || '已保存为在线链接',
    },
    { status: 201 }
  );
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    const email = session?.user?.email;

    if (!email) {
      return NextResponse.json({ message: '未登录，请先登录' }, { status: 401 });
    }

    const parsed = LinkImportSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        {
          message: '参数验证失败',
          errors: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const input = parsed.data;
    const allowedProjects = await getAllowedProjectsForEmail(email);
    if (!isProjectAllowed(input.project, allowedProjects)) {
      return NextResponse.json(
        { message: '没有该项目的上传权限，请联系管理员开通' },
        { status: 403 }
      );
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      const response = await fetch(input.url, {
        redirect: 'follow',
        signal: controller.signal,
        headers: {
          'user-agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36',
          accept: 'image/avif,image/webp,image/apng,image/*,video/*,*/*;q=0.8',
        },
      });

      const finalUrl = response.url || input.url;
      const contentType = normalizeContentType(response.headers.get('content-type'));
      const originalFileName = resolveOriginalFileName(response, finalUrl, contentType);
      const ext = extname(originalFileName).toLowerCase() || getExtensionFromUrl(finalUrl);
      const kind = response.ok ? getDownloadableKind(contentType, ext) : null;

      if (!kind) {
        return createLinkedMaterial(input, '该链接需要登录或不是直连媒体，已保存为在线链接');
      }

      const contentLength = Number(response.headers.get('content-length') || 0);
      if (contentLength > FILE_UPLOAD_LIMITS.MAX_FILE_SIZE) {
        return createLinkedMaterial(input, '远程文件超过大小限制，已保存为在线链接');
      }

      const buffer = await readResponseWithLimit(response, FILE_UPLOAD_LIMITS.MAX_FILE_SIZE);
      const uploadResult = await uploadDownloadedMedia(buffer, originalFileName, contentType, kind);

      const material = await createMaterial({
        name: input.name.trim(),
        type: kind === 'video' ? (input.type === '图片' ? 'AI视频' : input.type) : '图片',
        project: input.project,
        source: input.source,
        tag: input.tag,
        quality: input.quality,
        src: uploadResult.fileUrl,
        thumbnail: uploadResult.fileUrl,
        fileSize: uploadResult.fileSize,
        hash: uploadResult.hash,
        width: uploadResult.width,
        height: uploadResult.height,
        platform: '链接下载',
        advertiser: getLinkHostname(input.url),
      });

      return NextResponse.json(
        {
          material,
          mode: 'downloaded',
          message: '已从链接下载并上传到素材库',
        },
        { status: 201 }
      );
    } catch (error) {
      const message = error instanceof Error && error.message === 'REMOTE_FILE_TOO_LARGE'
        ? '远程文件超过大小限制，已保存为在线链接'
        : '无法直接下载该链接，已保存为在线链接';
      return createLinkedMaterial(input, message);
    } finally {
      clearTimeout(timeout);
    }
  } catch (error) {
    console.error('导入链接素材失败', error);
    const message = error instanceof Error ? error.message : '导入链接素材失败';
    return NextResponse.json({ message }, { status: 500 });
  }
}
