import { auth } from '@/lib/auth-config';
import { NextResponse } from 'next/server';

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // 保护 /admin 和 /dream-factory 路由
  if (pathname.startsWith('/admin') || pathname.startsWith('/dream-factory')) {
    const isAuthenticated = !!req.auth;
    // #region agent log
    const logData = { pathname, isAuthenticated, hasAuth: !!req.auth, authUserId: req.auth?.user?.id, authUserEmail: req.auth?.user?.email };
    fetch('http://127.0.0.1:7242/ingest/e41af73f-c02b-452a-8798-4720359cec20',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'proxy.ts:9',message:'proxy auth check',data:logData,timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion

    if (!isAuthenticated) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/e41af73f-c02b-452a-8798-4720359cec20',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'proxy.ts:13',message:'redirecting to login',data:{pathname,callbackUrl:pathname},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      // 未登录，重定向到登录页
      const loginUrl = new URL('/auth/login', req.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/admin/:path*', '/dream-factory/:path*'], // 保护 /admin 和 /dream-factory 路由
};

