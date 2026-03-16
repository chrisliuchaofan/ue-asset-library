import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/components/providers';
import { getStorageMode } from '@/lib/storage';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';

export { viewport } from './viewport';

export const metadata: Metadata = {
  title: {
    default: '爆款工坊',
    template: '%s | 爆款工坊',
  },
  description: 'AI 辅助素材制作工具 - 提升游戏广告素材质量与效率',
  keywords: ['爆款工坊', '素材制作', 'AI审核', '游戏广告', '素材管理'],
  authors: [{ name: '爆款工坊' }],
  openGraph: {
    title: '爆款工坊',
    description: 'AI 辅助素材制作工具 - 提升游戏广告素材质量与效率',
    type: 'website',
    locale: 'zh_CN',
    siteName: '爆款工坊',
  },
  twitter: {
    card: 'summary_large_image',
    title: '爆款工坊',
    description: 'AI 辅助素材制作工具 - 提升游戏广告素材质量与效率',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: '/icon.svg',
    shortcut: '/icon.svg',
    apple: '/icon.svg',
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();
  // ✅ 获取 CDN base（优先使用客户端可访问的变量）
  const cdnBase = process.env.NEXT_PUBLIC_CDN_BASE || '/';
  // 使用统一的存储模式推断函数，确保与 storage.ts 逻辑一致
  const storageMode = getStorageMode();
  // 优先使用 NEXT_PUBLIC_ 前缀的变量（客户端可访问），如果没有则使用服务端变量
  // 注意：服务端变量在客户端不可访问，所以需要 NEXT_PUBLIC_ 前缀
  const ossBucket = process.env.NEXT_PUBLIC_OSS_BUCKET || '';
  const ossRegion = process.env.NEXT_PUBLIC_OSS_REGION || '';
  
  // 如果客户端变量未设置，尝试从服务端变量获取（仅在服务端）
  // 但这样客户端仍然无法访问，所以需要在 .env.local 中配置 NEXT_PUBLIC_OSS_BUCKET 和 NEXT_PUBLIC_OSS_REGION
  const serverOssBucket = process.env.OSS_BUCKET || '';
  const serverOssRegion = process.env.OSS_REGION || '';
  
  // 如果客户端变量未设置，使用服务端变量（但客户端无法访问，所以需要配置 NEXT_PUBLIC_ 版本）
  const finalOssBucket = ossBucket || (typeof window === 'undefined' ? serverOssBucket : '');
  const finalOssRegion = ossRegion || (typeof window === 'undefined' ? serverOssRegion : '');
  
  // 构建注入到客户端的配置
  const clientConfig: {
    cdnBase: string;
    storageMode: string;
    oss?: { bucket: string; region: string };
  } = {
    cdnBase,
    storageMode,
  };
  
  // 如果是 OSS 模式，注入 OSS 配置（仅 bucket 和 region，不包含敏感信息）
  // 注意：必须使用 NEXT_PUBLIC_ 前缀的变量才能在客户端访问
  if (storageMode === 'oss' && (ossBucket || serverOssBucket) && (ossRegion || serverOssRegion)) {
    clientConfig.oss = {
      bucket: ossBucket || serverOssBucket,
      region: ossRegion || serverOssRegion,
    };
  }
  
  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        {/* Google Fonts - Space Grotesk 和 Inter */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@100;200;300;400;500;600;700&family=Inter:wght@100;200;300;400;500;600;700&display=swap" rel="stylesheet" />
        {/* Favicon - 使用 SVG 图标，兼容浏览器对 favicon.ico 的请求 */}
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="alternate icon" href="/icon.svg" />
        <link rel="shortcut icon" href="/icon.svg" />
        <link rel="apple-touch-icon" href="/icon.svg" />
        {/* DNS 预解析和预连接，提升资源加载速度 */}
        {cdnBase && cdnBase !== '/' && (
          <>
            <link rel="dns-prefetch" href={cdnBase} />
            <link rel="preconnect" href={cdnBase} crossOrigin="anonymous" />
          </>
        )}
        {storageMode === 'oss' && (ossBucket || serverOssBucket) && (ossRegion || serverOssRegion) && (
          <>
            <link rel="dns-prefetch" href={`https://${ossBucket || serverOssBucket}.oss-${(ossRegion || serverOssRegion).replace(/^oss-/, '')}.aliyuncs.com`} />
            <link rel="preconnect" href={`https://${ossBucket || serverOssBucket}.oss-${(ossRegion || serverOssRegion).replace(/^oss-/, '')}.aliyuncs.com`} crossOrigin="anonymous" />
          </>
        )}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.__CDN_BASE__ = ${JSON.stringify(cdnBase)};
              window.__STORAGE_MODE__ = ${JSON.stringify(storageMode)};
              ${storageMode === 'oss' && (ossBucket || serverOssBucket) && (ossRegion || serverOssRegion) ? `
              window.__OSS_CONFIG__ = {
                bucket: ${JSON.stringify(ossBucket || serverOssBucket)},
                region: ${JSON.stringify(ossRegion || serverOssRegion)}
              };` : ''}
              (function(){var t=localStorage.getItem('theme');var d=document.documentElement;if(t==='light'){d.classList.add('light')}else if(t==='system'){if(window.matchMedia('(prefers-color-scheme:dark)').matches){d.classList.add('dark')}else{d.classList.add('light')}}else{d.classList.add('dark')}})();
            `,
          }}
        />
      </head>
      <body className="antialiased" suppressHydrationWarning>
        <NextIntlClientProvider messages={messages}>
          <Providers>{children}</Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

