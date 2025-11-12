import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // 启用压缩
  compress: true,
  
  // 移除 X-Powered-By 头（安全最佳实践）
  poweredByHeader: false,
  
  // 优化图片配置
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
    // 图片格式优化：优先使用 AVIF，回退到 WebP
    formats: ['image/avif', 'image/webp'],
    // 设备尺寸断点：优化常用尺寸，减少不必要的变体
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    // 图片质量：默认 80，平衡清晰度和文件大小
    minimumCacheTTL: 60 * 60 * 24 * 7, // 7天缓存
    // 禁用危险的外部图片优化（OSS已经优化）
    dangerouslyAllowSVG: false,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  
  // 优化构建输出
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
  
  // 优化输出
  output: 'standalone',
};

export default nextConfig;

