import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'UE 资产库',
  description: 'Unreal Engine 资产展示库',
  openGraph: {
    title: 'UE 资产库',
    description: 'Unreal Engine 资产展示库',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cdnBase = process.env.NEXT_PUBLIC_CDN_BASE || '/';
  const storageMode = process.env.STORAGE_MODE || process.env.NEXT_PUBLIC_STORAGE_MODE || 'local';
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
  const clientConfig: any = {
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
    <html lang="zh-CN">
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

