# 项目结构说明

## 目录结构

```
web/
├── app/                          # Next.js App Router 页面目录
│   ├── layout.tsx               # 根布局组件（包含全局 metadata）
│   ├── page.tsx                 # 首页 (/)
│   ├── admin/page.tsx           # 后台管理页（/admin）
│   ├── assets/                  # 资产相关页面
│   │   ├── page.tsx             # 资产列表页 (/assets)
│   │   └── [id]/                # 动态路由：资产详情页
│   │       ├── page.tsx         # 资产详情页 (/assets/[id])
│   │       └── not-found.tsx   # 404 页面
│   ├── api/assets/              # 资产管理 API
│   │   ├── route.ts             # GET/POST
│   │   └── [id]/route.ts        # GET/PUT/DELETE
│   └── globals.css              # 全局样式（Tailwind CSS）
│
├── components/                   # React 组件目录
│   ├── admin/                   # 后台管理相关组件
│   │   └── admin-dashboard.tsx  # 管理端主界面
│   ├── ui/                      # shadcn/ui 基础组件
│   │   ├── badge.tsx           # 标签组件
│   │   ├── button.tsx          # 按钮组件
│   │   ├── card.tsx            # 卡片组件
│   │   ├── checkbox.tsx        # 复选框组件
│   │   ├── input.tsx           # 输入框组件
│   │   ├── label.tsx           # 标签组件
│   │   └── skeleton.tsx        # 骨架屏组件
│   │
│   ├── asset-card.tsx          # 资产卡片组件（列表页使用）
│   ├── asset-card-skeleton.tsx # 资产卡片骨架屏
│   ├── assets-list.tsx         # 资产列表组件（包含搜索、筛选、分页逻辑）
│   ├── empty-state.tsx         # 空状态组件
│   ├── filter-sidebar.tsx      # 左侧筛选栏（标签、类型筛选）
│   ├── media-gallery.tsx       # 媒体画廊（详情页图片/视频展示）
│   └── search-box.tsx          # 顶部搜索框组件
│
├── data/                        # 数据层目录
│   ├── manifest.json           # 资产清单 JSON 文件（由脚本生成）
│   └── manifest.schema.ts      # Zod schema 定义（数据验证）
│
├── lib/                         # 工具函数与存储抽象
│   ├── data.ts                 # 数据加载函数（统一走 storage 抽象）
│   ├── storage.ts              # 存储模式实现（local/预留 oss）
│   └── utils.ts                # 通用工具函数（CDN URL、高亮、格式化等）
│
├── scripts/                     # 脚本目录
│   └── build_manifest.ts       # 生成 manifest.json 的脚本
│
├── public/                      # 静态资源目录
│   └── demo/                   # 资产文件目录（图片、视频）
│       └── .gitkeep           # Git 占位文件
│
├── .gitignore                   # Git 忽略文件配置
├── next.config.ts              # Next.js 配置文件
├── package.json                # 项目依赖和脚本
├── postcss.config.mjs          # PostCSS 配置（Tailwind）
├── README.md                   # 项目说明文档
├── tailwind.config.ts          # Tailwind CSS 配置
└── tsconfig.json               # TypeScript 配置
```

## 主要文件说明

### 路由文件

#### `app/page.tsx`
- **路由**: `/`
- **功能**: 首页，提供进入资产库的入口
- **类型**: 服务端组件（SSR）

#### `app/assets/page.tsx`
- **路由**: `/assets`
- **功能**: 资产列表页
  - 顶部搜索框
  - 左侧筛选栏（标签、类型）
  - 资产卡片网格
  - 分页导航
- **类型**: 服务端组件（SSR）
- **查询参数**:
  - `q`: 搜索关键词
  - `tags`: 选中的标签（逗号分隔）
  - `types`: 选中的类型（逗号分隔）
  - `page`: 页码

#### `app/assets/[id]/page.tsx`
- **路由**: `/assets/[id]`
- **功能**: 资产详情页
  - 显示资产完整信息
  - 媒体画廊（图片放大、视频播放）
  - 返回列表按钮
- **类型**: 静态生成（SSG）
- **生成**: 使用 `generateStaticParams` 预生成所有资产详情页

#### `app/admin/page.tsx`
- **路由**: `/admin`
- **功能**: 后台管理页
  - 展示当前存储模式（local / 预留 oss）
  - 在本地模式下提供新增、删除资产能力
  - 调用 `/api/assets` 系列接口完成数据写入
- **类型**: 服务端组件 + 客户端组件组合

#### `app/api/assets/route.ts` 与 `app/api/assets/[id]/route.ts`
- **功能**: 提供资产增删改查 API
  - `GET /api/assets`：获取全部资产
  - `POST /api/assets`：创建资产（本地模式写入 manifest）
  - `GET /api/assets/{id}`：获取单个资产
  - `PUT /api/assets/{id}`：更新资产
  - `DELETE /api/assets/{id}`：删除资产
- **适配**: 通过 `lib/storage.ts` 判断存储模式；当切换为 `oss` 时返回 “未实现” 提示，方便后续接入阿里云等云存储

### 核心组件

#### `components/assets-list.tsx`
- **功能**: 资产列表主组件
- **特性**:
  - 客户端组件（使用 `useSearchParams`）
  - 实时搜索和筛选
  - 分页逻辑
  - 关键词高亮
- **Props**: `assets`

#### `components/asset-card.tsx`
- **功能**: 单个资产卡片
- **显示内容**:
  - 封面图（图片或视频缩略图）
  - 标题（支持关键词高亮）
  - 标签（最多显示 3 个）
  - 尺寸/时长信息
  - 文件大小

#### `components/filter-sidebar.tsx`
- **功能**: 左侧筛选栏
- **筛选项**:
  - 类型筛选（图片/视频）
  - 标签筛选（多选）
  - 显示每个筛选项的资产数量
  - 清除筛选按钮

#### `components/search-box.tsx`
- **功能**: 顶部搜索框
- **特性**:
  - 实时搜索（URL 参数同步）
  - 防抖处理
  - 搜索状态指示

#### `components/media-gallery.tsx`
- **功能**: 详情页媒体展示
- **特性**:
  - 图片：支持点击放大预览
  - 视频：HTML5 视频播放器（禁止自动播放）
  - 响应式布局

#### `components/admin/admin-dashboard.tsx`
- **功能**: 后台管理主界面
- **特性**:
  - 显示当前存储模式与 CDN 配置
  - 列表查看资产并支持删除、预览
  - 在 `local` 存储模式下可新增资产（直接写入 `manifest.json`）
  - 表单支持填写标签、尺寸、文件大小、资源路径等信息

### 数据层

#### `data/manifest.schema.ts`
- **功能**: Zod schema 定义
- **验证**: 确保 manifest.json 数据格式正确
- **导出类型**: `Asset`, `Manifest`
- **扩展**:
  - `AssetCreateSchema` / `AssetUpdateSchema`：用于后台管理与 API 参数校验

#### `data/manifest.json`
- **功能**: 资产清单数据
- **格式**: JSON 数组
- **生成**: 由 `scripts/build_manifest.ts` 自动生成

#### `lib/data.ts`
- **功能**: 数据加载函数（统一调用 `lib/storage.ts`）
- **函数**:
  - `getAllAssets()`: 获取所有资产（异步，支持不同存储模式）
  - `getAssetById()`: 根据 ID 获取资产
  - `getAllTags()`: 获取所有标签
  - `getAllTypes()`: 获取所有类型

#### `lib/storage.ts`
- **功能**: 存储抽象层
- **实现**:
  - `local`：直接读写 `data/manifest.json`
  - `oss`：预留实现（当前抛异常，等待对接阿里云 OSS 或 NAS API）
- **函数**:
  - `listAssets()`, `getAsset()`
  - `createAsset()`, `updateAsset()`, `deleteAsset()`
  - `getStorageMode()`：读取 `STORAGE_MODE` / `NEXT_PUBLIC_STORAGE_MODE`

#### `lib/utils.ts`
- **功能**: 通用工具函数
- **函数**:
  - `cn()`: 合并 className（Tailwind）
  - `getCdnBase()`: 获取 CDN 基础 URL
  - `getAssetUrl()`: 生成资产完整 URL
  - `highlightText()`: 关键词高亮
  - `formatFileSize()`: 格式化文件大小
  - `formatDuration()`: 格式化视频时长

### 脚本

#### `scripts/build_manifest.ts`
- **功能**: 扫描 `public/demo/` 目录，生成 `manifest.json`
- **支持格式**:
  - 图片: `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`, `.bmp`
  - 视频: `.mp4`, `.webm`, `.mov`, `.avi`, `.mkv`
- **自动提取**:
  - 文件大小
  - 图片尺寸（宽高）
  - 标签（从文件名提取，使用下划线分隔）
- **运行**: `npm run build:manifest`

## 数据流

1. **数据生成**: 运行 `build_manifest.ts` 扫描资产文件 → 生成 `manifest.json`
2. **数据加载**: 服务端组件通过 `lib/data.ts` → `lib/storage.ts` 读取当前存储介质（默认 manifest.json）
3. **后台写入**: 后台管理页调用 `/api/assets` → `lib/storage.ts`，在 `local` 模式下直接更新 manifest；切换至 `oss` 时可接入远程存储
4. **数据展示**: 组件接收数据 → 渲染 UI → 客户端交互（搜索、筛选）

## 技术特性

- ✅ **SSR**: 列表页和详情页使用服务端渲染
- ✅ **SSG**: 详情页支持静态生成（预渲染所有页面）
- ✅ **客户端过滤**: 搜索和筛选在客户端进行，响应快速
- ✅ **SEO 优化**: 每个页面都有 metadata 和 Open Graph 标签
- ✅ **响应式设计**: 移动端和桌面端自适应
- ✅ **CDN 支持**: 通过环境变量配置 CDN 基础 URL
- ✅ **类型安全**: 完整的 TypeScript 类型定义
- ✅ **数据验证**: 使用 Zod 验证数据格式
- ✅ **后台管理**: 本地模式可通过管理页增删资产，预留云存储扩展位
- ✅ **可插拔存储**: `lib/storage.ts` 支持 local / oss 模式，方便切换 NAS 或阿里云 OSS

