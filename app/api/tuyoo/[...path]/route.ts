import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

interface RouteContext {
  params: Promise<{ path?: string[] }>;
}

const ALLOWED_PATHS = new Set(['chat/completions']);

async function proxyToTuyoo(request: NextRequest, { params }: RouteContext) {
  const session = await getSession();
  if (!session?.user?.id && !session?.user?.email) {
    return NextResponse.json({ message: '未登录，请先登录' }, { status: 401 });
  }

  const token = process.env.LLM_TOKEN;
  if (!token) {
    return NextResponse.json({ message: '太石网关密钥未配置' }, { status: 500 });
  }

  const { path = [] } = await params;
  const upstreamPath = path.join('/');
  if (!ALLOWED_PATHS.has(upstreamPath)) {
    return NextResponse.json({ message: '不支持的太石网关接口' }, { status: 404 });
  }

  const baseUrl = (process.env.TUYOO_LLM_BASE_URL || 'https://relay.tuyoo.com/v1').replace(/\/$/, '');
  const upstreamUrl = `${baseUrl}/${upstreamPath}`;
  const body = request.method === 'GET' || request.method === 'HEAD' ? undefined : await request.text();

  const response = await fetch(upstreamUrl, {
    method: request.method,
    headers: {
      'Content-Type': request.headers.get('content-type') || 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body,
    cache: 'no-store',
  });

  const responseBody = await response.text();
  return new NextResponse(responseBody, {
    status: response.status,
    headers: {
      'Content-Type': response.headers.get('content-type') || 'application/json',
    },
  });
}

export const POST = proxyToTuyoo;
