import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: '恒星UE资产库',
    template: '%s | 恒星UE资产库',
  },
  description: 'Unreal Engine 资产展示库 - 浏览和管理 UE 资产资源',
  keywords: ['Unreal Engine', 'UE', '资产库', '游戏开发', '3D资源'],
  authors: [{ name: '恒星UE资产库' }],
  openGraph: {
    title: '恒星UE资产库',
    description: 'Unreal Engine 资产展示库 - 浏览和管理 UE 资产资源',
    type: 'website',
    locale: 'zh_CN',
    siteName: '恒星UE资产库',
  },
  twitter: {
    card: 'summary_large_image',
    title: '恒星UE资产库',
    description: 'Unreal Engine 资产展示库 - 浏览和管理 UE 资产资源',
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
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // ✅ 获取 CDN base（优先使用客户端可访问的变量）
  const cdnBase = process.env.NEXT_PUBLIC_CDN_BASE || '/';
  const storageMode = 'oss';
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
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
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
            `,
          }}
        />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}

