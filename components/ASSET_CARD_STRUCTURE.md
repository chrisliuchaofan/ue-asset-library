# AssetCardGallery 组件结构说明

## 元素层级关系（Z-Index）

```
Card (rounded-xl, overflow-visible)
├── 预览图区域
│   ├── 预览图容器 (rounded-t-xl, overflow-hidden) - z: 默认
│   │   ├── Video/Image (absolute inset-0, rounded-t-xl) - z: 10 (当前显示)
│   │   ├── 点击区域 div (absolute inset-0) - z: 0 ✅ 排除按钮区域
│   │   ├── 导航按钮区域 (absolute) - z: 20
│   │   ├── 指示器 (absolute bottom) - z: 10
│   │   └── 按钮组容器 (absolute bottom-right) - z: 50 ✅
│   │       └── 按钮 (pointer-events-auto, z-50) - z: 50 ✅
│   └── 缩略图区域（经典模式）
│       └── 缩略图网格容器 (overflow-hidden) ✅
│           └── 缩略图网格
└── 信息区域
```

## 修复后的结构

### 1. 圆角修复 ✅

**宫格图模式 (isGrid)**:
- 外层容器：`overflow-hidden rounded-t-xl` ✅
- 内层网格：`grid h-full` ✅
- 每个缩略图容器：`overflow-hidden` ✅ 修复：从 `overflow-visible` 改为 `overflow-hidden`

**经典/缩略图模式**:
- 预览图容器：`rounded-t-xl overflow-hidden` ✅
- 预览图/视频：添加 `rounded-t-xl` ✅ 确保图片和视频也有圆角
- 缩略图区域：添加 `overflow-hidden` ✅ 修复：添加容器圆角

### 2. 按钮点击区域修复 ✅

**修复方案**:
- 将 `Link` 改为 `div`，默认 `pointer-events-none`，点击时检查目标
- 按钮容器：`z-50` ✅ 从 `z-30` 提升
- 按钮本身：`z-50` ✅ 添加 `relative z-50`
- 点击区域：检查按钮相关元素，排除按钮区域 ✅

**点击处理逻辑**:
```typescript
onClick={(e) => {
  const target = e.target as HTMLElement;
  // 排除按钮、按钮容器和按钮子元素
  if (
    target.closest('button') ||
    target.closest('[role="button"]') ||
    target.closest('[class*="pointer-events-auto"]') ||
    target.closest('[class*="z-50"]')
  ) {
    return; // 不处理，让按钮处理
  }
  // 处理卡片点击
}}
```

## 层级说明

1. **z-0**: 点击区域（排除按钮）
2. **z-10**: 当前显示的图片/视频、指示器
3. **z-20**: 导航按钮区域
4. **z-50**: 操作按钮组（+号、复制、查看详情）

按钮的 z-index 足够高，确保不会被其他元素覆盖。

