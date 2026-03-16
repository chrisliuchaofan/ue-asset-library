import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // 性能监控采样率（生产环境 10%，开发环境 100%）
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // 会话回放（仅在出错时录制）
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 1.0,

  // 仅在有 DSN 时启用
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,

  // 环境标识
  environment: process.env.NODE_ENV,

  // 忽略常见的非关键错误
  ignoreErrors: [
    'ResizeObserver loop',
    'Non-Error exception captured',
    'Non-Error promise rejection captured',
    /Loading chunk \d+ failed/,
    /Failed to fetch/,
  ],
});
