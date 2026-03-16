'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { initPostHog, identifyUser, trackPageView } from '@/lib/analytics/posthog';

/**
 * PostHog Provider
 *
 * 放在 Dashboard 布局中，自动追踪页面浏览和用户标识
 */
export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useSession();

  // 初始化 PostHog
  useEffect(() => {
    initPostHog();
  }, []);

  // 标识用户
  useEffect(() => {
    if (session?.user?.email) {
      identifyUser(session.user.email, {
        name: session.user.name,
        team_id: session.user.activeTeamId,
        team_name: session.user.activeTeamName,
        role: session.user.activeTeamRole,
      });
    }
  }, [session]);

  // 追踪页面浏览
  useEffect(() => {
    trackPageView();
  }, [pathname]);

  return <>{children}</>;
}
