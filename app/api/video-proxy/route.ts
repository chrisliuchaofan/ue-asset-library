import { NextRequest, NextResponse } from 'next/server';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  'Access-Control-Max-Age': '86400',
};

function isAllowedUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

function jsonResponse(body: object, status: number): NextResponse {
  return NextResponse.json(body, {
    status,
    headers: CORS_HEADERS,
  });
}

async function fetchUpstream(
  targetUrl: string,
  options: { userAgent: string; referer?: string }
): Promise<Response> {
  const headers: Record<string, string> = {
    'User-Agent': options.userAgent,
  };
  if (options.referer) headers['Referer'] = options.referer;
  return fetch(targetUrl, { method: 'GET', headers, redirect: 'follow' });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(req: NextRequest) {
  try {
    const urlParam = req.nextUrl.searchParams.get('url');
    if (!urlParam) {
      return jsonResponse({ error: 'Missing url parameter' }, 400);
    }

    const targetUrl = decodeURIComponent(urlParam);
    if (!isAllowedUrl(targetUrl)) {
      return jsonResponse({ error: 'Invalid or disallowed url' }, 400);
    }

    const origin = new URL(targetUrl).origin + '/';
    const chromeUA =
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

    let resp = await fetchUpstream(targetUrl, {
      userAgent: chromeUA,
      referer: origin,
    });

    if (resp.status === 403) {
      resp = await fetchUpstream(targetUrl, { userAgent: chromeUA });
    }
    if (resp.status === 403) {
      resp = await fetchUpstream(targetUrl, {
        userAgent: 'Mozilla/5.0 (compatible; SuperInsight-VideoProxy/1.0)',
      });
    }

    if (!resp.ok) {
      return jsonResponse(
        { error: `Upstream returned ${resp.status}`, detail: '源站拒绝或需鉴权，请检查链接是否公开可访问' },
        resp.status
      );
    }

    const contentType = resp.headers.get('Content-Type') || 'application/octet-stream';
    const headers = new Headers(CORS_HEADERS);
    headers.set('Content-Type', contentType);

    return new NextResponse(resp.body as unknown as BodyInit, { status: 200, headers });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return jsonResponse({ error: message }, 502);
  }
}
