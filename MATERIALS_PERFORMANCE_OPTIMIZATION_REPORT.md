# 素材页面性能优化报告（补充）

## 已完成的优化 ✅

### 1. 视频加载优化
- ✅ 视频 preload 策略：非当前视频使用 `preload="none"`
- ✅ 视频元素渲染：只渲染当前可见的视频
- ✅ 视频预览逻辑：默认显示首帧（暂停），悬停时播放
- ✅ 抽帧优化：仅用于 AI 解析，不再用于预览

### 2. 服务端缓存优化
- ✅ ISR（增量静态再生）：`revalidate = 60` 秒
- ✅ 减少服务端数据获取频率

### 3. 客户端筛选优化
- ✅ 优先使用客户端筛选：数据量 < 1000 时直接在前端筛选
- ✅ 避免不必要的服务端请求

### 4. 虚拟滚动实现
- ✅ 为素材列表实现虚拟滚动（使用 `@tanstack/react-virtual`）
- ✅ 只渲染可见区域的卡片，支持大量素材

### 5. 上传时缩略图优化
- ✅ 上传视频后立即提取并上传缩略图到 OSS
- ✅ 展示页面优先使用已有缩略图

---

## 额外发现的性能优化点 🔍

### 1. 组件未使用 React.memo（中等优先级）

**问题**：
- `MaterialCardGallery` 组件没有使用 `React.memo`
- `AssetCardGallery` 使用了 `memo`，但素材卡片没有
- 当列表更新时，所有卡片都会重新渲染

**影响**：
- 几百条素材时，不必要的重渲染会导致性能下降
- 即使 props 没有变化，也会触发重新渲染

**优化方向**：
- 使用 `React.memo` 包装 `MaterialCardGallery`
- 添加自定义比较函数，只在关键 props 变化时重新渲染

**位置**：`components/material-card-gallery.tsx` 第 33 行

---

### 2. Resize 事件监听器未防抖（轻微优先级）

**问题**：
- 多个组件都监听了 `window.resize` 事件
- 没有防抖处理，窗口调整时会频繁触发

**影响**：
- 窗口调整时可能触发大量计算
- 影响滚动和交互流畅度

**优化方向**：
- 使用防抖（debounce）处理 resize 事件
- 或使用 `ResizeObserver` API（更现代）

**位置**：
- `components/material-card-gallery.tsx` 第 56 行
- `components/materials-list.tsx` 第 32、56 行
- `components/materials-page-shell.tsx` 第 22 行

---

### 3. highlightText 函数未使用 useMemo（轻微优先级）

**问题**：
- `highlightText` 每次渲染都会执行
- 即使 `keyword` 和 `material.name` 没有变化

**影响**：
- 不必要的字符串处理和正则表达式计算
- 几百条素材时累积开销

**优化方向**：
- 使用 `useMemo` 缓存 `highlightedName`
- 只在 `material.name` 或 `keyword` 变化时重新计算

**位置**：`components/material-card-gallery.tsx` 第 143 行

---

### 4. 多个 useEffect 可能合并优化（轻微优先级）

**问题**：
- `materials-list-with-header.tsx` 中有多个独立的 `useEffect`
- 某些可以合并以减少执行次数

**影响**：
- 多次 effect 执行可能影响性能
- 代码可读性降低

**优化方向**：
- 合并相关的 `useEffect`（如果逻辑允许）
- 确保依赖项正确，避免不必要的执行

**位置**：`components/materials-list-with-header.tsx` 第 266-298 行

---

### 5. 图片 URL 计算可能优化（轻微优先级）

**问题**：
- `getClientAssetUrl` 和 `getOptimizedImageUrl` 在每次渲染时都可能执行
- 某些情况下可以缓存结果

**影响**：
- 重复的 URL 处理计算
- 几百条素材时累积开销

**优化方向**：
- 使用 `useMemo` 缓存 URL 计算结果
- 只在依赖项变化时重新计算

**位置**：`components/material-card-gallery.tsx` 第 141 行

---

### 6. 虚拟滚动行高估算可能不准确（轻微优先级）

**问题**：
- 虚拟滚动的 `estimatedRowHeight` 是固定估算值
- 实际卡片高度可能因内容而异

**影响**：
- 滚动位置可能不够精确
- 需要动态测量实际高度

**优化方向**：
- 使用 `rowVirtualizer.measureElement` 动态测量
- 已有实现，但可以优化初始估算值

**位置**：`components/materials-list.tsx` 第 104-110 行

---

## 优化优先级建议

### 高优先级（立即优化）
1. ✅ 视频 preload 策略 - **已完成**
2. ✅ 虚拟滚动实现 - **已完成**
3. ✅ 服务端缓存优化 - **已完成**

### 中优先级（建议优化）
4. **组件使用 React.memo** - 减少不必要的重渲染
5. **Resize 事件防抖** - 提升窗口调整时的性能

### 低优先级（可选优化）
6. highlightText 使用 useMemo - 减少字符串处理
7. 合并相关 useEffect - 代码优化
8. URL 计算缓存 - 减少重复计算

---

## 性能测试建议

### 测试场景
1. **3 条视频**：测试首屏加载速度
2. **50 条素材**：测试虚拟滚动性能
3. **200 条素材**：测试大量数据下的性能
4. **筛选操作**：测试筛选响应速度
5. **窗口调整**：测试 resize 事件性能

### 关键指标
- **首屏加载时间**（FCP、LCP）
- **交互响应时间**（筛选、滚动）
- **内存使用**（大量素材时）
- **网络请求数量**（减少不必要的请求）

---

## 总结

### 已完成的核心优化
1. ✅ 视频加载策略优化
2. ✅ 虚拟滚动实现
3. ✅ 服务端缓存优化
4. ✅ 客户端筛选优化
5. ✅ 上传时缩略图优化

### 建议的额外优化
1. 使用 React.memo 减少重渲染
2. Resize 事件防抖处理
3. highlightText 使用 useMemo 缓存

### 预期效果
- **3 条视频**：首屏加载速度提升 50-70%
- **几百条素材**：虚拟滚动确保流畅，不会卡顿
- **筛选操作**：客户端筛选响应更快（< 100ms）

所有核心优化已完成，额外优化可以根据实际测试结果决定是否实施。

