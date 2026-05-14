import { NextResponse } from 'next/server';
import { getOSSClient } from '@/lib/oss-client';
import { dbGetPromptCaseById } from '@/lib/prompt-library/prompt-cases-db';

const PASSTHROUGH_HEADERS = [
  'accept-ranges',
  'content-length',
  'content-range',
  'content-type',
  'etag',
  'last-modified',
];

function getOssObjectKey(url: string): string | null {
  try {
    const parsed = new URL(url);
    const key = decodeURIComponent(parsed.pathname.replace(/^\/+/, ''));
    return key.startsWith('assets/') ? key : null;
  } catch {
    const key = url.replace(/^\/+/, '');
    return key.startsWith('assets/') ? key : null;
  }
}

function copyMediaHeaders(upstream: Response) {
  const headers = new Headers();
  for (const header of PASSTHROUGH_HEADERS) {
    const value = upstream.headers.get(header);
    if (value) headers.set(header, value);
  }
  if (!headers.has('content-type')) headers.set('content-type', 'video/mp4');
  headers.set('accept-ranges', 'bytes');
  headers.set('cache-control', 'private, max-age=300');
  return headers;
}

async function getMediaUrl(id: string) {
  const item = await dbGetPromptCaseById(id);
  return item?.mediaUrl || null;
}

async function proxyMedia(mediaUrl: string, request: Request, headOnly = false) {
  const key = getOssObjectKey(mediaUrl);
  const upstreamHeaders = new Headers();
  const range = request.headers.get('range');
  if (range) {
    upstreamHeaders.set('range', range);
  } else if (headOnly) {
    upstreamHeaders.set('range', 'bytes=0-0');
  }

  let targetUrl = mediaUrl;
  if (key) {
    targetUrl = (getOSSClient() as any).signatureUrl(key, { expires: 60 * 60 });
  }

  const upstream = await fetch(targetUrl, {
    method: 'GET',
    headers: upstreamHeaders,
    redirect: 'follow',
  });

  if (!upstream.ok && upstream.status !== 206) {
    return NextResponse.json({ message: '视频加载失败' }, { status: upstream.status || 502 });
  }

  return new NextResponse(headOnly ? null : (upstream.body as unknown as BodyInit), {
    status: upstream.status,
    headers: copyMediaHeaders(upstream),
  });
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const mediaUrl = await getMediaUrl(id);
  if (!mediaUrl) {
    return NextResponse.json({ message: '视频不存在' }, { status: 404 });
  }

  try {
    return await proxyMedia(mediaUrl, request);
  } catch (error) {
    console.error('[PromptLibrary] 加载视频失败:', error);
    return NextResponse.json({ message: '视频加载失败' }, { status: 502 });
  }
}

export async function HEAD(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const mediaUrl = await getMediaUrl(id);
  if (!mediaUrl) {
    return new NextResponse(null, { status: 404 });
  }

  try {
    return await proxyMedia(mediaUrl, request, true);
  } catch (error) {
    console.error('[PromptLibrary] 加载视频头信息失败:', error);
    return new NextResponse(null, { status: 502 });
  }
}
