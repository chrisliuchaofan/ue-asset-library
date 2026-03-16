import { auth } from '@/lib/auth-config';
import { NextResponse } from 'next/server';

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // 公开路由（不需要认证）
  const publicPrefixes = [
    '/auth/login',
    '/auth/register',
    '/api/auth',
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
    '/dashboard/:path*',
    '/admin/:path*',
    '/materials/:path*',
    '/analysis/:path*',
    '/studio/:path*',
    '/review/:path*',
    '/inspirations/:path*',
    '/templates/:path*',
    '/knowledge/:path*',
    '/assets/:path*',
    '/weekly-reports/:path*',
    '/settings/:path*',
    '/interview/:path*',
    '/api/((?!auth).*)',
  ],
};
