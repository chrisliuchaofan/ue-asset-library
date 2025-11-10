import { NextResponse } from 'next/server';
import { randomBytes, createHmac } from 'crypto';
import { FILE_UPLOAD_LIMITS } from '@/lib/constants';
import { getStorageMode } from '@/lib/storage';

const FIVE_MINUTES_MS = 5 * 60 * 1000;
const DEFAULT_PREFIX = 'assets/';

function createPolicyBase64(keyPrefix: string) {
  const maxSize = FILE_UPLOAD_LIMITS.MAX_FILE_SIZE;
  const expiration = new Date(Date.now() + FIVE_MINUTES_MS).toISOString();
  const policy = {
    expiration,
    conditions: [
      ['content-length-range', 0, maxSize],
      ['starts-with', '$key', keyPrefix],
    ],
  };
  return Buffer.from(JSON.stringify(policy)).toString('base64');
}

export async function POST(request: Request) {
  if (getStorageMode() !== 'oss') {
    return NextResponse.json(
      { message: '当前存储模式未启用 OSS 直传' },
      { status: 400 }
    );
  }

  const accessKeyId = process.env.OSS_ACCESS_KEY_ID;
  const accessKeySecret = process.env.OSS_ACCESS_KEY_SECRET;
  const bucket = process.env.OSS_BUCKET;
  const region = process.env.OSS_REGION;
  const endpoint = process.env.OSS_ENDPOINT;
  const cdnBase = process.env.NEXT_PUBLIC_CDN_BASE;

  if (!accessKeyId || !accessKeySecret || !bucket || !region) {
    return NextResponse.json(
      { message: 'OSS 配置不完整，请检查 OSS_ACCESS_KEY_ID/SECRET、OSS_BUCKET、OSS_REGION' },
      { status: 500 }
    );
  }

  const { fileName, fileType, fileSize } = await request.json().catch(() => ({}));

  if (!fileName || typeof fileName !== 'string') {
    return NextResponse.json({ message: '缺少 fileName 参数' }, { status: 400 });
  }
  if (!fileType || typeof fileType !== 'string') {
    return NextResponse.json({ message: '缺少 fileType 参数' }, { status: 400 });
  }
  if (typeof fileSize !== 'number') {
    return NextResponse.json({ message: '缺少 fileSize 参数' }, { status: 400 });
  }
  if (fileSize > FILE_UPLOAD_LIMITS.MAX_FILE_SIZE) {
    return NextResponse.json(
      {
        message: `文件大小超过限制，最大 ${FILE_UPLOAD_LIMITS.MAX_FILE_SIZE / 1024 / 1024}MB`,
      },
      { status: 400 }
    );
  }

  const ext = fileName.includes('.') ? fileName.substring(fileName.lastIndexOf('.')) : '';
  const uniqueId = randomBytes(8).toString('hex');
  const objectKey = `${DEFAULT_PREFIX}${Date.now()}-${uniqueId}${ext}`;

  const policyBase64 = createPolicyBase64(DEFAULT_PREFIX);
  const signature = createHmac('sha1', accessKeySecret).update(policyBase64).digest('base64');

  const host =
    endpoint && endpoint.trim().length > 0
      ? endpoint.startsWith('http')
        ? endpoint
        : `https://${endpoint.replace(/^https?:\/\//, '')}`
      : `https://${bucket}.${region}.aliyuncs.com`;

  const finalUrl = (() => {
    if (cdnBase && cdnBase.trim() && cdnBase !== '/' && !cdnBase.startsWith('http')) {
      return `${cdnBase.replace(/\/+$/, '')}/${objectKey}`;
    }
    if (cdnBase && (cdnBase.startsWith('http://') || cdnBase.startsWith('https://'))) {
      return `${cdnBase.replace(/\/+$/, '')}/${objectKey}`;
    }
    return `${host.replace(/\/+$/, '')}/${objectKey}`;
  })();

  return NextResponse.json({
    uploadUrl: host,
    key: objectKey,
    fileUrl: finalUrl,
    cdnUrl: finalUrl,
    expireAt: Math.floor((Date.now() + FIVE_MINUTES_MS) / 1000),
    maxSize: FILE_UPLOAD_LIMITS.MAX_FILE_SIZE,
    fields: {
      key: objectKey,
      policy: policyBase64,
      OSSAccessKeyId: accessKeyId,
      signature,
      success_action_status: '200',
      'Content-Type': fileType,
    },
  });
}

