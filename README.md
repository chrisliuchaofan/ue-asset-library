# UE 资产库

基于 Next.js 15 (App Router) + TypeScript + Tailwind CSS + shadcn/ui 构建的 Unreal Engine 资产展示库。

## 功能特性

- 🎨 现代化的 UI 设计（基于 shadcn/ui）
- 🔍 实时搜索和筛选
- 📱 响应式设计
- ⚡ SSR 首屏渲染
- 🎯 关键词高亮
- 🖼️ 图片和视频预览
- 📄 分页支持
- 🏷️ 标签和类型筛选
- 🔎 SEO 优化
- 🛠️ 后台管理页面（本地快速写入，预留云存储接口）
- ☁️ 云存储抽象层（local / oss，可对接阿里云 OSS 或 NAS）

## 技术栈

- **框架**: Next.js 15 (App Router)
- **语言**: TypeScript
- **样式**: Tailwind CSS
- **UI 组件**: shadcn/ui
- **图标**: lucide-react
- **数据验证**: Zod

## 项目结构

```
web/
├── app/                    # Next.js App Router 页面
│   ├── layout.tsx         # 根布局
│   ├── page.tsx           # 首页
│   ├── admin/             # 后台管理页面
│   │   └── page.tsx
│   ├── assets/            # 资产相关页面
│   │   ├── page.tsx       # 资产列表页
│   │   └── [id]/          # 资产详情页
│   │       ├── page.tsx
│   │       └── not-found.tsx
│   ├── api/               # 资产管理 API
│   │   └── assets/
│   │       ├── [id]/route.ts
│   │       └── route.ts
│   └── globals.css        # 全局样式
├── components/            # React 组件
│   ├── admin/            # 后台管理组件
│   │   └── admin-dashboard.tsx
│   ├── ui/               # shadcn/ui 基础组件
│   ├── asset-card.tsx    # 资产卡片
│   ├── assets-list.tsx   # 资产列表
│   ├── filter-sidebar.tsx # 筛选侧边栏
│   ├── media-gallery.tsx  # 媒体画廊
│   └── search-box.tsx     # 搜索框
├── data/                  # 数据层
│   ├── manifest.json     # 资产清单（自动生成）
│   └── manifest.schema.ts # Zod 验证 schema
├── lib/                   # 工具函数与存储抽象
│   ├── data.ts           # 数据加载函数
│   ├── storage.ts        # 存储模式抽象（local / oss）
│   └── utils.ts          # 通用工具函数
├── scripts/               # 脚本
│   └── build_manifest.ts # 生成 manifest.json
└── public/                # 静态资源
    └── demo/             # 示例资产文件
```

## 快速开始

### 1. 安装依赖

```bash
cd web
npm install
```

### 2. 准备资产文件

将图片和视频文件放入 `public/demo/` 目录。

### 3. 生成资产清单

```bash
npm run build:manifest
```

这会扫描 `public/demo/` 目录下的所有图片和视频文件，并生成 `data/manifest.json`。

### 4. 配置环境变量

创建 `.env.local` 文件（示例）：

```env
NEXT_PUBLIC_CDN_BASE=/
STORAGE_MODE=oss
NEXT_PUBLIC_STORAGE_MODE=oss
OSS_BUCKET=your-bucket
OSS_REGION=oss-cn-xxx
OSS_ACCESS_KEY_ID=xxx
OSS_ACCESS_KEY_SECRET=xxx
```

如果资产文件托管在 CDN 上，可以设置 `NEXT_PUBLIC_CDN_BASE` 为 CDN 基础 URL。所有读写操作都会直接使用 OSS。

### 5. 启动开发服务器

```bash
npm run dev
```

访问 [http://localhost:3000](http://localhost:3000)

### 6. 构建生产版本

```bash
npm run build
npm start
```

## 主要文件说明

### 路由

- `/` - 首页
- `/assets` - 资产列表页（支持搜索、筛选、分页）
- `/assets/[id]` - 资产详情页
- `/admin` - 后台管理页面（支持在 OSS 模式下直接增删改资产与素材）

### 数据层

- `data/manifest.json` - 资产清单 JSON 文件
- `data/manifest.schema.ts` - Zod schema 定义，用于验证数据格式
- `lib/data.ts` - 数据加载和查询函数
- `lib/storage.ts` - 存储抽象，预留 OSS / NAS 扩展点

### 核心组件

- `components/asset-card.tsx` - 资产卡片组件，显示封面、标题、标签等
- `components/assets-list.tsx` - 资产列表组件，处理搜索、筛选、分页
- `components/filter-sidebar.tsx` - 左侧筛选栏（标签、类型）
- `components/search-box.tsx` - 顶部搜索框
- `components/media-gallery.tsx` - 详情页媒体画廊（支持图片放大、视频播放）
- `components/admin/admin-dashboard.tsx` - 后台管理界面（表单 + 列表）

### API

- `GET /api/assets` - 获取资产列表
- `POST /api/assets` - 新建资产
- `GET /api/assets/:id` - 获取单个资产
- `PUT /api/assets/:id` - 更新资产
- `DELETE /api/assets/:id` - 删除资产

### 工具函数

- `lib/utils.ts` - 包含 CDN URL 处理、关键词高亮、文件大小格式化等工具函数

## 资产清单格式

`manifest.json` 格式如下：

```json
{
  "assets": [
    {
      "id": "asset-1",
      "name": "资产名称",
      "type": "image" | "video",
      "tags": ["标签1", "标签2"],
      "thumbnail": "/demo/thumbnail.jpg",
      "src": "/demo/asset.jpg",
      "filesize": 1024000,
      "width": 1920,
      "height": 1080,
      "duration": 30
    }
  ]
}
```

## 环境变量

### 基础配置

- `NEXT_PUBLIC_CDN_BASE` - CDN/静态资源基础 URL（默认 `/`，可指向 OSS/NAS）
- `STORAGE_MODE` - 服务端存储模式（`local` | `oss`，默认 `local`）
- `NEXT_PUBLIC_STORAGE_MODE` - 前端展示的存储模式标签，保持与 `STORAGE_MODE` 一致

### 阿里云 OSS 配置（仅在 `STORAGE_MODE=oss` 时需要）

- `OSS_BUCKET` - OSS Bucket 名称
- `OSS_REGION` - OSS 地域（例如：`oss-cn-hangzhou`）
- `OSS_ACCESS_KEY_ID` - OSS AccessKey ID
- `OSS_ACCESS_KEY_SECRET` - OSS AccessKey Secret
- `OSS_ENDPOINT` - OSS Endpoint（可选，不填会自动根据 region 生成）

**配置示例**：复制 `.env.local.example` 为 `.env.local`，然后填入你的 OSS 配置信息。

## 开发说明

- 所有资产路径都通过 `getAssetUrl()` 函数处理，支持 CDN 配置
- 搜索和筛选在客户端进行，提供快速响应
- 列表页使用 SSR 首屏渲染，提升 SEO 和首屏性能
- 详情页支持静态生成（SSG），提升性能
- 后台管理页面支持本地和 OSS 两种模式，可通过环境变量切换
- `lib/storage.ts` 已实现 OSS 存储支持，manifest.json 会保存在 OSS 的根目录

## 注意事项

- 确保 `public/demo/` 目录存在且包含资产文件
- 视频文件需要手动填写 `duration` 字段，或使用其他工具获取
- 图片文件会自动读取尺寸信息
- 标签可以从文件名中提取（使用下划线分隔），例如：`asset_自然_风景.jpg`
- 在 NAS 部署时，可将 `STORAGE_MODE` 设为 `local`，静态文件保存在 NAS；切换到云端后，仅需调整环境变量与 `lib/storage.ts` 即可复用同一套前端
- 如需外网访问 NAS，请务必配置反向代理/HTTPS，避免暴露管理接口

