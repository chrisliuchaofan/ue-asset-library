# 性能优化总结

## 优化目标

根据 Lighthouse 性能报告，主要问题：
- **LCP (Largest Contentful Paint)**: 16.5秒 → 目标 < 2.5秒
- **TBT (Total Blocking Time)**: 2,120ms → 目标 < 300ms
- **Performance Score**: 46 → 目标 > 90

## 已实施的优化措施

### 1. 视频帧提取优化 ✅

**问题**: 视频帧提取在主线程同步执行，阻塞渲染

**解决方案**:
- 使用 `requestIdleCallback` 延迟执行视频帧提取
- 在浏览器空闲时执行，避免阻塞首屏渲染
- 分批提取帧，每帧绘制也使用 `requestIdleCallback`

**文件**: `components/asset-card-gallery.tsx`

**预期效果**: 减少 TBT 约 500-1000ms

### 6. Next.js 配置优化 ✅

**问题**: JavaScript 执行时间长（4.1秒），未使用的 JavaScript 多（449 KiB）

**解决方案**:
- 优化 Webpack 代码分割策略
  - React 框架代码单独分离
  - UI 库（Radix UI、Lucide React）单独分离
  - 其他大型库按需分离
- 启用包导入优化（`optimizePackageImports`）
- 生产环境移除 console.log（保留 error 和 warn）
- 配置 HTTP 缓存头

**文件**: `next.config.ts`

**预期效果**: 减少 JavaScript 执行时间约 1-2秒，减少未使用代码约 200-300 KiB

### 7. 组件动态导入优化 ✅

**问题**: 所有组件在首屏加载，增加初始包大小

**解决方案**:
- FilterSidebar 使用动态导入（`lazy`），只在侧边栏打开时加载
- 减少首屏 JavaScript 包大小

**文件**: `components/assets-page-shell.tsx`

**预期效果**: 减少初始 JavaScript 包大小约 50-100 KiB

### 8. 资源预加载和预连接 ✅

**问题**: DNS 解析和连接建立延迟

**解决方案**:
- 添加 DNS 预解析（`dns-prefetch`）
- 添加预连接（`preconnect`）到 CDN 和 OSS
- 提前建立连接，减少资源加载延迟

**文件**: `app/layout.tsx`

**预期效果**: 减少资源加载延迟约 100-300ms

### 9. 减少初始渲染数量 ✅

**问题**: 初始渲染的资产/素材数量过多，导致 JavaScript 执行时间长（4.0秒）和主线程工作多（5.3秒）

**解决方案**:
- **虚拟滚动优化**: 将 `overscan` 从 6 降到 1，减少约 83% 的初始渲染内容
- **素材列表优化**: 第一页从 50 个减少到 18 个，后续页面保持 50 个
- **优先图片优化**: 将 `PRIORITY_IMAGES_COUNT` 从 7 增加到 12，覆盖更多首屏可见区域

**文件**: 
- `lib/constants.ts`
- `components/assets-list.tsx`
- `components/materials-list.tsx`

**预期效果**: 
- 减少 JavaScript 执行时间约 1-1.5秒
- 减少主线程工作时间约 1-1.5秒
- 减少初始 DOM 节点数量约 50-60%
- 提升 LCP 约 1-2秒

### 10. 组件渲染优化（useMemo）✅

**问题**: 组件每次渲染都重新计算复杂值，浪费 CPU 资源

**解决方案**:
- 使用 `useMemo` 缓存复杂计算：
  - `galleryUrls` - 预览图/视频 URL 数组
  - `highlightedName` - 高亮文本
  - `imageUrls` / `videoUrls` - 图片和视频 URL 过滤
  - `displayIndex` / `validIndex` - 索引计算
  - `currentSource` / `currentUrl` - 当前显示的源和 URL
  - `optimizedImageWidth` - 优化的图片宽度
  - `rawTags` / `displayTags` - 标签处理
  - `columns` / `rowCount` - 布局计算
- 使用 `useCallback` 缓存函数：
  - `renderGridRow` - 渲染网格行函数

**文件**: 
- `components/asset-card-gallery.tsx`
- `components/assets-list.tsx`

**预期效果**: 
- 减少不必要的重新计算
- 减少 JavaScript 执行时间约 200-500ms
- 提升组件渲染性能约 20-30%

### 11. 视频帧提取进一步延迟 ✅

**问题**: 视频帧提取仍然可能影响主线程性能

**解决方案**:
- 将视频帧提取延迟从 2秒增加到 5秒
- 确保首屏完全渲染后再执行
- 使用双重延迟策略（requestIdleCallback + setTimeout）

**文件**: 
- `components/asset-card-gallery.tsx`

**预期效果**: 
- 进一步减少主线程阻塞
- 提升首屏交互响应速度

### 2. 组件渲染优化 ✅

**问题**: 组件频繁重渲染，导致不必要的计算

**解决方案**:
- 使用 `React.memo` 包装 `AssetCardGallery` 组件
- 自定义比较函数，只在关键属性变化时重新渲染
- 优化 `ThumbnailPreviewPopover` 组件，使用 `memo`

**文件**: `components/asset-card-gallery.tsx`

**预期效果**: 减少渲染时间约 30-50%

### 3. 首屏图片加载优化 ✅

**问题**: 首屏图片尺寸过大，加载时间长

**解决方案**:
- 首屏图片使用更小的尺寸（320-400px vs 450-560px）
- 添加 `fetchPriority="high"` 属性，优先加载首屏图片
- 优化 `sizes` 属性，更精确地指定图片尺寸

**文件**: `components/asset-card-gallery.tsx`

**预期效果**: 减少 LCP 约 2-5秒

### 4. 自动滚动名称优化 ✅

**问题**: 名称滚动动画在首屏立即执行，阻塞渲染

**解决方案**:
- 使用 `requestIdleCallback` 延迟初始化滚动动画
- 优先保证首屏渲染，动画在浏览器空闲时启动

**文件**: `components/asset-card-gallery.tsx`

**预期效果**: 减少 TBT 约 100-200ms

### 5. 数据获取优化 ✅

**问题**: 每次请求都重新获取数据，没有缓存

**解决方案**:
- 使用 ISR (Incremental Static Regeneration)
- 每 60 秒重新生成一次页面
- 允许静态生成，提升首屏加载速度

**文件**: `app/assets/page.tsx`

**预期效果**: 减少首屏加载时间约 1-3秒

## 性能指标预期改善

### 第一轮优化（组件和渲染优化）

| 指标 | 优化前 | 优化后 | 改善 |
|------|--------|--------|------|
| LCP | 16.5s | ~12s | -4.5s (27%) |
| TBT | 2,120ms | ~1,200ms | -920ms (43%) |
| Performance Score | 46 | ~55 | +9 (20%) |

### 第二轮优化（JavaScript 和代码分割）

| 指标 | 优化前 | 目标 | 预期改善 |
|------|--------|------|----------|
| JavaScript 执行时间 | 4.1s | < 2s | -2.1s (51%) |
| 主线程工作 | 5.4s | < 3s | -2.4s (44%) |
| 未使用 JavaScript | 449 KiB | < 200 KiB | -249 KiB (55%) |
| 网络负载 | 2,708 KiB | < 2,000 KiB | -708 KiB (26%) |
| Performance Score | 49 | > 75 | +26 (53%) |

### 第三轮优化（减少初始渲染数量）

| 指标 | 优化前 | 目标 | 预期改善 |
|------|--------|------|----------|
| JavaScript 执行时间 | 4.0s | < 2.5s | -1.5s (38%) |
| 主线程工作 | 5.3s | < 3.5s | -1.8s (34%) |
| 初始 DOM 节点 | ~74 个资产 | ~30-40 个 | -45% |
| LCP | ~12s | < 8s | -4s (33%) |
| Performance Score | 71 | > 80 | +9 (13%) |

### 综合优化目标

| 指标 | 最终目标 | 说明 |
|------|----------|------|
| LCP | < 2.5s | Core Web Vitals 优秀 |
| TBT | < 300ms | Core Web Vitals 优秀 |
| Performance Score | > 90 | Lighthouse 优秀 |
| JavaScript 执行时间 | < 1.5s | 快速交互 |
| 未使用 JavaScript | < 100 KiB | 最小化浪费 |

## 进一步优化建议

### 短期优化（1-2周）

1. **图片预加载** ✅ 部分完成
   - ✅ 使用 `loading="eager"` 和 `priority` 属性
   - ⏳ 使用 `<link rel="preload">` 预加载首屏关键图片
   - ⏳ 实现响应式图片（srcset）

2. **代码分割优化** ✅ 已完成
   - ✅ FilterSidebar 使用动态导入
   - ⏳ 更多非关键组件使用动态导入（如 CartDialog、MediaGallery）

3. **字体优化**
   - ⏳ 使用 `font-display: swap` 避免字体阻塞渲染
   - ⏳ 预加载关键字体

4. **HTTP/2 优化**
   - ⏳ 确保服务器支持 HTTP/2
   - ⏳ 配置服务器推送（Server Push）关键资源

### 中期优化（1个月）

1. **服务端缓存**
   - 实现 Redis 缓存层
   - 缓存频繁访问的数据

2. **CDN 优化**
   - 确保所有静态资源使用 CDN
   - 配置适当的缓存头

3. **图片格式优化**
   - 使用 WebP/AVIF 格式
   - 实现响应式图片（srcset）

### 长期优化（3个月）

1. **架构优化**
   - 考虑使用 Edge Functions 进行数据预取
   - 实现流式 SSR

2. **监控和分析**
   - 集成 Real User Monitoring (RUM)
   - 设置性能预算和告警

## 测试方法

### 本地测试

1. **Lighthouse**
   ```bash
   # 在 Chrome DevTools 中运行 Lighthouse
   # 或使用命令行工具
   lighthouse http://localhost:3000/assets --view
   ```

2. **Performance API**
   ```javascript
   // 在浏览器控制台运行
   performance.getEntriesByType('navigation')
   ```

### 生产环境测试

1. **PageSpeed Insights**
   - 访问 https://pagespeed.web.dev/
   - 输入生产环境 URL
   - 查看详细性能报告

2. **WebPageTest**
   - 访问 https://www.webpagetest.org/
   - 测试不同地理位置和网络条件

## 监控指标

### Core Web Vitals

- **LCP (Largest Contentful Paint)**: < 2.5s
- **FID (First Input Delay)**: < 100ms
- **CLS (Cumulative Layout Shift)**: < 0.1

### 其他重要指标

- **FCP (First Contentful Paint)**: < 1.8s
- **TTI (Time to Interactive)**: < 3.8s
- **TBT (Total Blocking Time)**: < 300ms

## 注意事项

1. **ISR 缓存**: 数据更新可能有最多 60 秒延迟，如需实时数据，考虑使用客户端数据获取
2. **requestIdleCallback**: 部分旧浏览器不支持，已实现降级方案
3. **图片优化**: 确保 OSS 图片处理服务正常工作
4. **React.memo**: 自定义比较函数需要仔细测试，确保不会遗漏必要的更新

## 回滚方案

如果优化导致问题，可以快速回滚：

1. **ISR 回滚**: 将 `revalidate` 改回 `0`，`dynamic` 改回 `'force-dynamic'`
2. **组件优化回滚**: 移除 `memo` 包装
3. **视频帧提取回滚**: 移除 `requestIdleCallback`，恢复同步执行

## 参考资源

- [Web Vitals](https://web.dev/vitals/)
- [Next.js Performance](https://nextjs.org/docs/app/building-your-application/optimizing)
- [React Performance](https://react.dev/learn/render-and-commit)
- [Chrome DevTools Performance](https://developer.chrome.com/docs/devtools/performance/)

