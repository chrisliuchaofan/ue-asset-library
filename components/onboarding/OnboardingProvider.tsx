'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { WelcomeDialog } from './WelcomeDialog';

const ONBOARDING_KEY = 'onboarding_completed';

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status, update } = useSession();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (status !== 'authenticated' || !session?.user) return;
    if (checked) return;

    // localStorage 作为 fallback（处理 admin 用户无 profile 的情况）
    const localCompleted = localStorage.getItem(ONBOARDING_KEY) === 'true';
    const sessionCompleted = session.user.onboardingCompleted === true;

    if (!localCompleted && !sessionCompleted) {
      setShowOnboarding(true);
    }
    setChecked(true);
  }, [status, session, checked]);

  const handleComplete = async () => {
    setShowOnboarding(false);
    // 立即写入 localStorage，确保导航后不再弹出
    localStorage.setItem(ONBOARDING_KEY, 'true');

    try {
      const response = await fetch('/api/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ onboarding_completed: true }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        console.warn('[Onboarding] 服务端未能保存完成状态:', payload?.message ?? response.statusText);
        return;
      }

      if (payload?.persisted !== false) {
        await update();
      }
    } catch (error) {
      console.error('[Onboarding] 标记完成失败:', error);
    }
  };

  return (
    <>
      {children}
      {showOnboarding && <WelcomeDialog onComplete={handleComplete} />}
    </>
  );
}
