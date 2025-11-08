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
  const ossBucket = process.env.NEXT_PUBLIC_OSS_BUCKET || process.env.OSS_BUCKET || '';
  const ossRegion = process.env.NEXT_PUBLIC_OSS_REGION || process.env.OSS_REGION || '';
  
  // 构建注入到客户端的配置
  const clientConfig: any = {
    cdnBase,
    storageMode,
  };
  
  // 如果是 OSS 模式，注入 OSS 配置（仅 bucket 和 region，不包含敏感信息）
  if (storageMode === 'oss' && ossBucket && ossRegion) {
    clientConfig.oss = {
      bucket: ossBucket,
      region: ossRegion,
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
              ${storageMode === 'oss' && ossBucket && ossRegion ? `
              window.__OSS_CONFIG__ = {
                bucket: ${JSON.stringify(ossBucket)},
                region: ${JSON.stringify(ossRegion)}
              };` : ''}
            `,
          }}
        />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}

