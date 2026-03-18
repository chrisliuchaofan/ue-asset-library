/**
 * PostHog 客户端配置
 *
 * 用户行为分析，仅在配置了 NEXT_PUBLIC_POSTHOG_KEY 时启用
 */

/**
 * PostHog 客户端配置 — 延迟加载优化
 *
 * posthog-js (~45KB gzip) 通过动态 import 延迟加载，
 * 不阻塞首屏渲染。首次调用时按需加载 SDK。
 */

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com';

let _initialized = false;
let _posthogPromise: Promise<typeof import('posthog-js')['default']> | null = null;

/** 按需加载 posthog-js SDK */
function getPostHog() {
  if (!_posthogPromise) {
    _posthogPromise = import('posthog-js').then(m => m.default);
  }
  return _posthogPromise;
}

/** 初始化 PostHog（仅在浏览器中调用一次） */
export async function initPostHog() {
  if (_initialized || typeof window === 'undefined' || !POSTHOG_KEY) {
    return;
  }

  const posthog = await getPostHog();
  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    person_profiles: 'identified_only',
    capture_pageview: false,
    capture_pageleave: true,
    autocapture: true,
    persistence: 'localStorage+cookie',
    mask_all_text: false,
    mask_all_element_attributes: false,
  });

  _initialized = true;
}

/** 标识用户（登录后调用） */
export async function identifyUser(userId: string, properties?: Record<string, any>) {
  if (!POSTHOG_KEY || typeof window === 'undefined') return;
  const posthog = await getPostHog();
  posthog.identify(userId, properties);
}

/** 重置用户标识（登出时调用） */
export async function resetUser() {
  if (!POSTHOG_KEY || typeof window === 'undefined') return;
  const posthog = await getPostHog();
  posthog.reset();
}

/** 追踪自定义事件 */
export async function trackEvent(event: string, properties?: Record<string, any>) {
  if (!POSTHOG_KEY || typeof window === 'undefined') return;
  const posthog = await getPostHog();
  posthog.capture(event, properties);
}

/** 追踪页面浏览 */
export async function trackPageView(url?: string) {
  if (!POSTHOG_KEY || typeof window === 'undefined') return;
  const posthog = await getPostHog();
  posthog.capture('$pageview', { $current_url: url || window.location.href });
}

/** PostHog 实例获取器（用于高级操作） */
export { getPostHog as getPostHogInstance };
