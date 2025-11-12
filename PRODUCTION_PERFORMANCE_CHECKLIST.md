# 生产环境性能检查清单

## ⚠️ 开发环境 vs 生产环境的差异

开发环境和生产环境在性能上可能存在显著差异，需要特别注意以下方面：

## 🔍 可能导致性能差异的因素

### 1. 代码压缩和优化 ✅

**开发环境**:
- 未压缩的代码
- 包含 source maps
- 包含调试信息
- 热重载开销

**生产环境**:
- ✅ 代码压缩（Terser/Uglify）
- ✅ Tree shaking
- ✅ 移除 console.log（保留 error/warn）
- ✅ 代码分割优化

**检查点**:
- [ ] 确认 `next.config.ts` 中的 `compiler.removeConsole` 在生产环境生效
- [ ] 确认 Webpack 优化配置只在生产环境应用（`!dev` 条件）

### 2. 图片优化 ⚠️

**开发环境**:
- Next.js Image 优化可能不完整
- 本地图片可能未优化

**生产环境**:
- ✅ Next.js Image 自动优化（AVIF/WebP）
- ✅ 图片尺寸优化
- ⚠️ **OSS 图片处理可能冲突**

**潜在问题**:
```typescript
// next.config.ts 中配置了图片优化
images: {
  formats: ['image/avif', 'image/webp'],
  unoptimized: false, // 启用 Next.js 优化
}

// 但代码中使用了 OSS 图片处理
getOptimizedImageUrl(path, width) {
  return `${url}?x-oss-process=image/resize,w_${width}...`;
}
```

**检查点**:
- [ ] 确认图片 URL 是否同时使用了 Next.js 优化和 OSS 优化（可能导致双重处理）
- [ ] 如果使用 OSS 优化，考虑设置 `unoptimized: true`
- [ ] 检查生产环境的图片加载速度

### 3. 环境变量配置 ⚠️

**关键环境变量**:
- `NEXT_PUBLIC_CDN_BASE` - CDN 基础路径
- `NEXT_PUBLIC_OSS_BUCKET` - OSS Bucket
- `NEXT_PUBLIC_OSS_REGION` - OSS 地域

**检查点**:
- [ ] 确认生产环境变量已正确配置
- [ ] 确认 CDN 配置是否正确（影响图片加载速度）
- [ ] 确认 OSS 配置是否正确（影响资源访问）

### 4. 缓存策略 ✅

**生产环境配置**:
```typescript
// next.config.ts
headers: [
  {
    source: '/:path*\\.(jpg|jpeg|png|gif|webp|svg|ico)',
    headers: [
      {
        key: 'Cache-Control',
        value: 'public, max-age=31536000, immutable',
      },
    ],
  },
]
```

**检查点**:
- [ ] 确认生产环境的缓存头已生效
- [ ] 检查浏览器 Network 面板，确认资源有正确的缓存头
- [ ] 首次访问和后续访问的性能差异应该明显

### 5. 代码分割 ⚠️

**生产环境优化**:
```typescript
// next.config.ts - 只在生产环境生效
if (!dev && !isServer) {
  config.optimization = {
    splitChunks: { ... }
  };
}
```

**检查点**:
- [ ] 确认生产构建的 chunk 数量合理
- [ ] 检查首屏加载的 JavaScript 大小
- [ ] 确认代码分割策略生效

### 6. ISR (Incremental Static Regeneration) ⚠️

**配置**:
```typescript
// app/assets/page.tsx
export const revalidate = 60; // 60秒重新生成
```

**检查点**:
- [ ] 确认生产环境 ISR 正常工作
- [ ] 首次访问和后续访问的性能差异
- [ ] 确认缓存策略不影响用户体验

## 🧪 测试方法

### 1. 本地生产构建测试

```bash
# 构建生产版本
npm run build

# 启动生产服务器
npm start

# 运行 Lighthouse
npx lighthouse http://localhost:3000/assets --view
```

### 2. 生产环境测试

```bash
# 使用 PageSpeed Insights
# https://pagespeed.web.dev/
# 输入生产环境 URL

# 或使用 WebPageTest
# https://www.webpagetest.org/
```

### 3. 对比测试

| 指标 | 开发环境 | 生产环境 | 差异 |
|------|----------|----------|------|
| Performance Score | ? | ? | ? |
| LCP | ? | ? | ? |
| TBT | ? | ? | ? |
| FCP | ? | ? | ? |
| JavaScript 大小 | ? | ? | ? |
| 图片大小 | ? | ? | ? |

## 🚨 常见问题排查

### 问题 1: 生产环境性能更差

**可能原因**:
1. 环境变量配置错误（CDN/OSS）
2. 图片优化冲突（Next.js + OSS）
3. 缓存未生效
4. 代码分割配置问题

**排查步骤**:
1. 检查 Network 面板，确认资源加载速度
2. 检查图片 URL，确认优化策略
3. 检查环境变量配置
4. 对比开发和生产构建的 chunk 大小

### 问题 2: 图片加载慢

**可能原因**:
1. CDN 配置错误
2. OSS 配置错误
3. 图片优化冲突
4. 网络问题

**排查步骤**:
1. 检查图片 URL 是否正确
2. 检查 CDN/OSS 配置
3. 检查图片格式（AVIF/WebP 是否生效）
4. 检查图片大小

### 问题 3: JavaScript 执行时间长

**可能原因**:
1. 代码分割未生效
2. 代码压缩未生效
3. 未使用的代码未移除
4. 第三方库过大

**排查步骤**:
1. 检查构建输出，确认 chunk 大小
2. 检查代码分割配置
3. 使用 Bundle Analyzer 分析包大小
4. 检查第三方库的使用情况

## 📋 部署前检查清单

- [ ] 运行 `npm run build` 确认构建成功
- [ ] 运行 `npm start` 本地测试生产版本
- [ ] 运行 Lighthouse 测试本地生产版本
- [ ] 确认环境变量已配置
- [ ] 确认 CDN/OSS 配置正确
- [ ] 检查图片优化策略
- [ ] 检查缓存头配置
- [ ] 对比开发和生产构建的包大小

## 🔧 推荐优化

### 1. 图片优化策略统一

**选项 A**: 使用 Next.js 优化（推荐用于非 OSS 图片）
```typescript
// next.config.ts
images: {
  unoptimized: false, // 启用 Next.js 优化
}
```

**选项 B**: 使用 OSS 优化（推荐用于 OSS 图片）
```typescript
// next.config.ts
images: {
  unoptimized: true, // 禁用 Next.js 优化，使用 OSS 优化
}

// 代码中
getOptimizedImageUrl(path, width) {
  // 使用 OSS 图片处理
}
```

### 2. 添加 Bundle Analyzer

```bash
npm install --save-dev @next/bundle-analyzer
```

```typescript
// next.config.ts
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

module.exports = withBundleAnalyzer(nextConfig);
```

```bash
# 分析包大小
ANALYZE=true npm run build
```

### 3. 性能监控

考虑集成性能监控工具：
- Vercel Analytics
- Google Analytics (Core Web Vitals)
- Sentry Performance Monitoring

## 📝 记录模板

### 性能测试记录

**测试时间**: YYYY-MM-DD HH:MM
**测试环境**: Production / Preview / Development
**测试 URL**: https://...

**Lighthouse 结果**:
- Performance: ?/100
- LCP: ?s
- TBT: ?ms
- FCP: ?s
- CLS: ?

**Network 分析**:
- 首屏资源数量: ?
- 总资源大小: ? MB
- 加载时间: ?s

**问题记录**:
1. ...
2. ...

**优化建议**:
1. ...
2. ...

