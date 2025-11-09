import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // 启用压缩
  compress: true,
  
  // 移除 X-Powered-By 头（安全最佳实践）
  poweredByHeader: false,
  
  images: {
    remotePatterns: [
      // 允许所有 OSS 域名（使用通配符）
      {
        protocol: 'https',
        hostname: '*.oss-*.aliyuncs.com',
      },
      {
        protocol: 'http',
        hostname: '*.oss-*.aliyuncs.com',
      },
      // 允许 localhost（开发环境）
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3001',
        pathname: '/**',
      },
      {
        protocol: 'http',
        hostname: '127.0.0.1',
        port: '3001',
        pathname: '/**',
      },
    ],
    unoptimized: false,
    // 图片格式优化
    formats: ['image/avif', 'image/webp'],
    // 设备尺寸断点
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  
  // 生产环境优化
  ...(process.env.NODE_ENV === 'production' && {
    // 启用 SWC 压缩
    swcMinify: true,
  }),
};

export default nextConfig;

