'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { isAdmin } from './is-admin';

/**
 * 管理员权限检查 Hook
 * 如果用户不是管理员，重定向到 /admin
 */
export function useRequireAdmin() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);

  useEffect(() => {
    // 如果已经检查过且已授权，不再重复检查
    if (hasChecked && isAuthorized) {
      console.log('[useRequireAdmin] 已授权，跳过检查');
      return;
    }

    if (status === 'loading') {
      console.log('[useRequireAdmin] Session 加载中...');
      return;
    }

    if (status === 'unauthenticated') {
      console.log('[useRequireAdmin] 未登录，重定向到登录页');
      router.push('/auth/login');
      setHasChecked(true);
      return;
    }

    if (session?.user?.email) {
      const email = session.user.email;
      const adminCheck = isAdmin(email);
      const currentPath = typeof window !== 'undefined' ? window.location.pathname : 'unknown';
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/e41af73f-c02b-452a-8798-4720359cec20',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/auth/require-admin.tsx:37',message:'admin check',data:{email,adminCheck,currentPath,status,hasChecked,isAuthorized},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
      // #endregion
      console.log('[useRequireAdmin] 权限检查:', { email, adminCheck, currentPath, status, hasChecked, isAuthorized });
      
      setHasChecked(true);
      
      if (!adminCheck) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/e41af73f-c02b-452a-8798-4720359cec20',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/auth/require-admin.tsx:45',message:'admin check failed - redirecting',data:{email,adminUsers:process.env.NEXT_PUBLIC_ADMIN_USERS||process.env.ADMIN_USERS||'未配置',currentPath},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
        // #endregion
        console.warn('[useRequireAdmin] ❌ 用户不是管理员，准备重定向到 /admin');
        console.warn('[useRequireAdmin] 重定向详情:', { 
          email, 
          adminUsers: process.env.NEXT_PUBLIC_ADMIN_USERS || process.env.ADMIN_USERS || '未配置',
          currentPath 
        });
        // 延迟重定向，给页面一个渲染的机会
        setTimeout(() => {
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/e41af73f-c02b-452a-8798-4720359cec20',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/auth/require-admin.tsx:54',message:'executing redirect to /admin',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
          // #endregion
          console.warn('[useRequireAdmin] 执行重定向到 /admin');
          router.replace('/admin');
        }, 500);
        return;
      }
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/e41af73f-c02b-452a-8798-4720359cec20',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/auth/require-admin.tsx:59',message:'admin check passed',data:{email},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
      // #endregion
      console.log('[useRequireAdmin] ✅ 权限检查通过，允许访问');
      setIsAuthorized(true);
    } else {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/e41af73f-c02b-452a-8798-4720359cec20',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/auth/require-admin.tsx:62',message:'no email in session',data:{hasSession:!!session,status},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
      // #endregion
      console.warn('[useRequireAdmin] session 中没有 email', { session, status });
    }
  }, [session, status, router, hasChecked, isAuthorized]);

  return { isAuthorized, isLoading: status === 'loading' || !hasChecked };
}

