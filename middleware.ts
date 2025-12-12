import { auth } from '@/lib/auth-config';
import { NextResponse } from 'next/server';

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // 只保护 /admin 路由
  if (pathname.startsWith('/admin')) {
    const isAuthenticated = !!req.auth;

    if (!isAuthenticated) {
      // 未登录，重定向到登录页
      const loginUrl = new URL('/auth/login', req.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/admin/:path*'], // 只保护 /admin 开头的路由
};

