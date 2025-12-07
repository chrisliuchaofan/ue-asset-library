import { authOptions } from '@/lib/auth-config';
import { getToken } from 'next-auth/jwt';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 只保护 /admin 路由
  if (pathname.startsWith('/admin')) {
    const token = await getToken({
      req: request,
      secret: authOptions.secret,
    });

    if (!token) {
      // 未登录，重定向到登录页
      const loginUrl = new URL('/auth/login', request.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'], // 只保护 /admin 开头的路由
};

