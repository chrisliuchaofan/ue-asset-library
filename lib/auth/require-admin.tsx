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
    // 如果已经检查过，不再重复检查
    if (hasChecked) {
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
      console.log('[useRequireAdmin] 权限检查:', { email, adminCheck, currentPath, status });
      
      setHasChecked(true);
      
      if (!adminCheck) {
        console.warn('[useRequireAdmin] ❌ 用户不是管理员，准备重定向到 /admin');
        console.warn('[useRequireAdmin] 重定向详情:', { 
          email, 
          adminUsers: process.env.NEXT_PUBLIC_ADMIN_USERS || process.env.ADMIN_USERS || '未配置',
          currentPath 
        });
        // 使用 router.replace 而不是 setTimeout，避免闪回
        router.replace('/admin');
        return;
      }
      
      console.log('[useRequireAdmin] ✅ 权限检查通过，允许访问');
      setIsAuthorized(true);
    } else {
      console.warn('[useRequireAdmin] session 中没有 email', { session, status });
      setHasChecked(true);
    }
  }, [session, status, router, hasChecked]);

  return { isAuthorized, isLoading: status === 'loading' || !hasChecked };
}

