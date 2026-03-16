import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // 服务端性能监控采样率
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // 仅在有 DSN 时启用
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,

  // 环境标识
  environment: process.env.NODE_ENV,
});
