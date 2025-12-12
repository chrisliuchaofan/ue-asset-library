import type { NextConfig } from 'next';
import { join } from 'path';

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
    optimizePackageImports: ['lucide-react', '@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-radio-group'],
    // 启用部分预渲染，提升性能
    ppr: false, // 暂时禁用，等稳定后启用
  },
  
  // 明确使用 webpack（因为项目中有自定义 webpack 配置）
  // 设置空的 turbopack 配置来明确表示使用 webpack
  // 这样可以避免 Next.js 16 默认使用 Turbopack 时的配置冲突
  turbopack: {},
  
  // 优化输出
  output: 'standalone',
  
  // 修复 workspace root 警告：明确指定工作区根目录
  // 这可以避免 Next.js 因为检测到多个 lockfiles 而推断错误的工作区根目录
  outputFileTracingRoot: process.cwd(),
  
  // 编译器优化
  compiler: {
    // 移除 console.log（生产环境）
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },
  
  // 优化 Webpack 配置
  webpack: (config, { dev, isServer }) => {
    // 生产环境客户端优化
    if (!dev && !isServer) {
      // 优化代码分割
      config.optimization = {
        ...config.optimization,
        moduleIds: 'deterministic',
        runtimeChunk: 'single',
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            default: false,
            vendors: false,
            // React 框架代码分离
            framework: {
              name: 'framework',
              chunks: 'all',
              test: /[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/,
              priority: 40,
              enforce: true,
            },
            // UI 库分离
            ui: {
              name: 'ui',
              chunks: 'all',
              test: /[\\/]node_modules[\\/](@radix-ui|lucide-react)[\\/]/,
              priority: 35,
              enforce: true,
            },
            // 其他大型库分离
            lib: {
              test(module: { resource?: string }) {
                return module.resource &&
                  module.resource.includes('node_modules') &&
                  !module.resource.includes('react') &&
                  !module.resource.includes('react-dom') &&
                  !module.resource.includes('@radix-ui') &&
                  !module.resource.includes('lucide-react');
              },
              name(module: { resource?: string }) {
                const packageName = module.resource?.match(/[\\/]node_modules[\\/](.*?)([\\/]|$)/)?.[1];
                return `lib.${packageName?.replace('@', '').replace('/', '-') || 'unknown'}`;
              },
              priority: 30,
              minChunks: 1,
              reuseExistingChunk: true,
            },
            // 公共代码
            commons: {
              name: 'commons',
              minChunks: 2,
              priority: 20,
            },
          },
          maxInitialRequests: 25,
          minSize: 20000,
        },
      };
    }
    
    return config;
  },
  
  // 重定向 favicon.ico 到 icon.svg
  async rewrites() {
    return [
      {
        source: '/favicon.ico',
        destination: '/icon.svg',
      },
    ];
  },
  
  // 优化 HTTP 头
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
      {
        // 静态资源缓存
        source: '/:path*\\.(jpg|jpeg|png|gif|webp|svg|ico|woff|woff2|ttf|eot)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        // JavaScript 和 CSS 缓存
        source: '/:path*\\.(js|css)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
};

export default nextConfig;

