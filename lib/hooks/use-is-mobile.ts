'use client';

import { useState, useEffect, useSyncExternalStore } from 'react';

const MOBILE_BREAKPOINT = 640;

// 单例事件源：所有组件共享一个 resize listener，避免 N 个卡片 = N 个 listener
let listeners = new Set<() => void>();
let isMobileValue = typeof window !== 'undefined' ? window.innerWidth < MOBILE_BREAKPOINT : false;
let setupDone = false;

function setupResizeListener() {
  if (setupDone || typeof window === 'undefined') return;
  setupDone = true;

  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  const handleResize = () => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      const newValue = window.innerWidth < MOBILE_BREAKPOINT;
      if (newValue !== isMobileValue) {
        isMobileValue = newValue;
        listeners.forEach(l => l());
      }
    }, 150);
  };

  window.addEventListener('resize', handleResize, { passive: true });
}

function subscribe(callback: () => void) {
  setupResizeListener();
  listeners.add(callback);
  return () => { listeners.delete(callback); };
}

function getSnapshot() {
  return isMobileValue;
}

function getServerSnapshot() {
  return false;
}

/**
 * 共享的 isMobile hook — 全局只注册一个 resize listener，
 * 无论有多少组件实例使用此 hook。
 */
export function useIsMobile(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
