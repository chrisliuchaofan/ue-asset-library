import { auth } from '@/lib/auth-config';
import { NextResponse } from 'next/server';
const MATRIX_CREATE_URL = 'https://matrix.tuyoo.com/newVideo/index';

function isPromptLibraryStudioEntry(params: URLSearchParams) {
  const source = params.get('source') || params.get('from') || params.get('ref');

  return (
    source === 'prompt-library' ||
    source === 'ai-prompt-library' ||
    (params.has('caseId') && params.has('prompt'))
  );
}

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const host = req.headers.get('host') || '';
  const hostname = host.split(':')[0].toLowerCase();
  const canonicalHost = 'www.factory-buy.com';
  const isLocalHost = ['localhost', '127.0.0.1', '0.0.0.0', '::1'].includes(hostname);
  const shouldCanonicalize =
    hostname !== canonicalHost &&
    !isLocalHost &&
    (hostname === 'factory-buy.com' ||
      hostname.endsWith('.vercel.app') ||
      hostname.endsWith('.factory-buy.com'));

  if (shouldCanonicalize) {
    const canonicalUrl = req.nextUrl.clone();
    canonicalUrl.protocol = 'https:';
    canonicalUrl.host = canonicalHost;
    return NextResponse.redirect(canonicalUrl, 308);
  }

  if (pathname === '/studio' && isPromptLibraryStudioEntry(req.nextUrl.searchParams)) {
    return NextResponse.redirect(new URL(MATRIX_CREATE_URL));
  }

  // 公开路由（不需要认证）
  const publicPrefixes = [
    '/auth/login',
    '/auth/register',
    '/api/auth',
    '/prompt-library',
    '/api/prompt-library/cases',
    '/api/prompt-library/docs',
    '/api/prompt-library/media',
    '/api/billing/webhook', // Stripe webhook 不需要用户认证
    '/api/landing',         // Landing page 公共 API（hero 视频等）
    '/interview',           // 公开访谈页（token 验证，免登录）
    '/api/knowledge/interviews/',  // 访谈对话 API（token 验证）
  ];

  if (publicPrefixes.some(prefix => pathname.startsWith(prefix))) {
    return NextResponse.next();
  }

  // 已登录用户访问首页 → 重定向到素材库（Landing Page 仅面向未登录用户）
  if (pathname === '/' && req.auth) {
    return NextResponse.redirect(new URL('/materials', req.url));
  }

  // /dashboard/xxx → /xxx 重定向（旧链接兼容）
  if (pathname.startsWith('/dashboard/')) {
    const newPath = pathname.replace('/dashboard', '');
    return NextResponse.redirect(new URL(newPath || '/', req.url));
  }

  // 保护 /admin 路由
  if (pathname.startsWith('/admin')) {
    if (!req.auth) {
      const loginUrl = new URL('/auth/login', req.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // 保护 Dashboard 路由
  const protectedPrefixes = [
    '/materials',
    '/analysis',
    '/studio',
    '/review',
    '/inspirations',
    '/templates',
    '/knowledge',
    '/assets',
    '/weekly-reports',
    '/settings',
  ];

  if (protectedPrefixes.some(prefix => pathname.startsWith(prefix)) && !req.auth) {
    const loginUrl = new URL('/auth/login', req.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 保护 API 路由（返回 401）
  if (pathname.startsWith('/api/') && !req.auth) {
    return NextResponse.json({ message: '未登录' }, { status: 401 });
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    '/',
    '/auth/:path*',
    '/dashboard/:path*',
    '/admin/:path*',
    '/materials/:path*',
    '/analysis/:path*',
    '/studio/:path*',
    '/review/:path*',
    '/inspirations/:path*',
    '/templates/:path*',
    '/prompt-library/:path*',
    '/knowledge/:path*',
    '/assets/:path*',
    '/weekly-reports/:path*',
    '/delivery/:path*',
    '/settings/:path*',
    '/interview/:path*',
    '/api/((?!auth).*)',
  ],
};
