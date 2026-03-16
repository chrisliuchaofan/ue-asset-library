'use client';

import { LandingPageContent } from './LandingPageContent';

/**
 * Landing Page 客户端包装器
 *
 * 之前用 ssr: false 避免浏览器扩展导致的 hydration mismatch，
 * 但这会导致首屏全黑（需等 JS 下载 + 执行完毕）。
 *
 * 改用直接渲染 + suppressHydrationWarning，
 * 让服务端输出 HTML → 浏览器立即看到内容 → hydrate 时容忍扩展注入的差异。
 */
export function LandingClientWrapper() {
  return (
    <div suppressHydrationWarning>
      <LandingPageContent />
    </div>
  );
}
