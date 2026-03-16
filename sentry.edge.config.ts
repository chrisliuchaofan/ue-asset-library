import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Edge runtime 性能监控
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // 仅在有 DSN 时启用
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,

  environment: process.env.NODE_ENV,
});
