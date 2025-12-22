'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';

/**
 * Hook: 检查当前用户是否是管理员
 * 在客户端组件中使用，会调用 API 检查权限
 */
export function useIsAdmin() {
  const { data: session, status } = useSession();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (status === 'loading') {
      return;
    }

    if (status === 'unauthenticated' || !session?.user?.email) {
      setIsAdmin(false);
      setIsLoading(false);
      return;
    }

    // 先尝试使用环境变量（如果配置了 NEXT_PUBLIC_ADMIN_USERS）
    const adminUsers = process.env.NEXT_PUBLIC_ADMIN_USERS || '';
    if (adminUsers && session.user.email) {
      // 使用本地的 isAdmin 函数
      const { isAdmin: checkAdmin } = require('./is-admin');
      const result = checkAdmin(session.user.email);
      setIsAdmin(result);
      setIsLoading(false);
      return;
    }

    // 如果没有配置 NEXT_PUBLIC_ADMIN_USERS，调用 API
    fetch('/api/auth/check-admin')
      .then((res) => res.json())
      .then((data) => {
        setIsAdmin(data.isAdmin || false);
      })
      .catch((error) => {
        console.error('[useIsAdmin] API 调用失败:', error);
        setIsAdmin(false);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [session, status]);

  return { isAdmin, isLoading };
}

