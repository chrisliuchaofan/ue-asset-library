import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
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
  },
};

export default nextConfig;

