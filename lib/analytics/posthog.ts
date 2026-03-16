/**
 * PostHog 客户端配置
 *
 * 用户行为分析，仅在配置了 NEXT_PUBLIC_POSTHOG_KEY 时启用
 */

import posthog from 'posthog-js';

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com';

let _initialized = false;

/** 初始化 PostHog（仅在浏览器中调用一次） */
export function initPostHog() {
  if (_initialized || typeof window === 'undefined' || !POSTHOG_KEY) {
    return;
  }

  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    person_profiles: 'identified_only',
    capture_pageview: false, // 手动控制页面浏览事件
    capture_pageleave: true,
    autocapture: true,
    persistence: 'localStorage+cookie',
    // 隐私友好：不记录输入内容
    mask_all_text: false,
    mask_all_element_attributes: false,
  });

  _initialized = true;
}

/** 标识用户（登录后调用） */
export function identifyUser(userId: string, properties?: Record<string, any>) {
  if (!POSTHOG_KEY || typeof window === 'undefined') return;
  posthog.identify(userId, properties);
}

/** 重置用户标识（登出时调用） */
export function resetUser() {
  if (!POSTHOG_KEY || typeof window === 'undefined') return;
  posthog.reset();
}

/** 追踪自定义事件 */
export function trackEvent(event: string, properties?: Record<string, any>) {
  if (!POSTHOG_KEY || typeof window === 'undefined') return;
  posthog.capture(event, properties);
}

/** 追踪页面浏览 */
export function trackPageView(url?: string) {
  if (!POSTHOG_KEY || typeof window === 'undefined') return;
  posthog.capture('$pageview', { $current_url: url || window.location.href });
}

/** PostHog 实例（用于高级操作） */
export { posthog };
