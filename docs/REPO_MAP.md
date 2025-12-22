# 仓库地图

## 顶层目录结构说明

```
web/
├── app/                    # Next.js App Router 页面和 API 路由
├── components/            # React 组件库
├── lib/                   # 核心工具库和业务逻辑
├── data/                  # 数据模型定义和静态数据
├── types/                 # TypeScript 类型定义
├── scripts/               # 构建脚本和工具脚本（必需，用于降低人为失误）
├── public/                # 静态资源文件
├── backend-legacy/        # 历史遗留后端服务（Frozen/Deprecated，不纳入路线图）
└── docs/                  # 项目文档
```

## 部署边界（Deployment Boundaries）

### 构建系统排除的目录

以下目录/文件**不应**被构建系统包含：

1. **开发依赖和构建产物**
   - `node_modules/`, `.next/`, `out/`, `dist/`, `*.tsbuildinfo`

2. **历史遗留模块**
   - `backend-legacy/` - 历史遗留后端服务（Frozen，不参与前端构建）

3. **环境配置和敏感信息**
   - `.env.local`, `.env*.local`, `.env`, `.vercel/`

4. **历史文档**
   - `docs/_graveyard/` - 历史文档归档

5. **运行时数据文件**
   - `data/manifest.json`, `data/materials.json` - 运行时生成的数据文件（OSS 模式存储在 OSS）
   - `data/export-logs.json`, `data/asset-stats.json` - 运行时日志

### 前端构建根目录

**构建根目录**：`web/`（项目根目录）

- Next.js 构建命令应在 `web/` 目录执行
- 构建输出到 `web/.next/`（开发）或 `web/out/`（静态导出）
- Vercel 等平台应配置构建根目录为 `web/`

### 历史遗留模块说明

**`backend-legacy/` - 历史遗留后端服务（Frozen / Deprecated）**：

- **状态**：Frozen（冻结），不进行扩展，不纳入路线图
- **说明**：包含旧的 NestJS 后端服务代码，已冻结。未来如果体量/需求确实出现再评估。
- **前端依赖**：前端代码中可能仍存在对 `lib/backend-client.ts` 的调用，但这些调用应为可选功能，不影响核心功能

## 主要目录职责

### `/app` - Next.js 应用核心

**职责**：Next.js App Router 的页面路由和 API 路由

**入口文件**：
- `app/layout.tsx` - 根布局组件，配置全局 metadata、CDN、存储模式等
- `app/globals.css` - 全局样式（Tailwind CSS）

**关键子目录**：
- `app/page.tsx` - 首页（根路由 `/`）
- `app/assets/` - 资产相关页面
- `app/materials/` - 素材相关页面
- `app/dream-factory/` - 即梦工厂 AI 功能页面（AI 是主价值模块）
- `app/admin/` - 后台管理页面
- `app/api/` - API 路由（Next.js API Routes）
  - `assets/` - 资产管理 API
  - `materials/` - 素材管理 API
  - `ai/` - AI 功能 API（资产库 AI 为辅助，梦工厂 AI 为主流程）
  - `auth/` - 认证相关 API（NextAuth）
  - `credits/` - 积分系统 API（可选，依赖 backend-legacy）

**依赖关系**：
- 依赖 `components/` 组件
- 依赖 `lib/` 工具函数和业务逻辑
- 依赖 `data/*.schema.ts` 类型定义

### `/components` - React 组件库

**职责**：可复用的 React 组件

**关键子目录**：
- `components/ui/` - 基础 UI 组件（shadcn/ui）
- `components/admin/` - 后台管理相关组件
- `components/dream-factory/` - 即梦工厂相关组件（AI 主价值模块）
- `components/` - 业务组件（资产卡片、列表、筛选等）

**依赖关系**：
- 依赖 `lib/utils.ts` 工具函数
- 依赖 `data/*.schema.ts` 类型定义

### `/lib` - 核心工具库

**职责**：业务逻辑、工具函数、外部服务集成

**关键文件**：

- `lib/storage.ts` - **存储抽象层**（核心）
  - 支持 `local`（仅开发调试）和 `oss`（线上必须）两种存储模式
  - OSS 用于 manifest/materials/预览/缩略图等展示必需数据
  - 提供统一的资产和素材读写接口
  - 包含缓存机制
  - **依赖**：`lib/oss-client.ts`, `data/manifest.schema.ts`

- `lib/data.ts` - 数据访问层
  - 资产数据的查询和操作函数
  - 调用 `storage.ts` 的统一接口

- `lib/materials-data.ts` - 素材数据访问层
  - 素材数据的查询和操作函数

- `lib/auth-config.ts` - **认证配置**（核心）
  - NextAuth 配置
  - 用户认证逻辑

- `lib/auth.ts` - 认证工具函数
  - `getSession()`, `isAuthenticated()`, `getCurrentUser()`

- `lib/backend-client.ts` - 后端 API 客户端（可选，依赖历史遗留模块）
  - 封装对历史遗留后端服务的 HTTP 请求
  - 积分、日志等功能（如果后端服务可用，但不影响核心功能）

- `lib/oss-client.ts` - OSS 客户端封装
  - 阿里云 OSS 的初始化配置

- `lib/nas-utils.ts` - NAS 路径工具
  - 生成和格式化 NAS 路径
  - 处理广州/深圳 NAS 路径

### `/data` - 数据模型定义

**职责**：数据结构的类型定义和验证

**关键文件**：

- `data/manifest.schema.ts` - **资产数据模型**（核心）
  - 使用 Zod 定义 Asset 和 Manifest 的 schema
  - 导出 TypeScript 类型
  - 定义默认资产类型列表
  - **包含 NAS 路径字段**：`guangzhouNas`、`shenzhenNas`（核心约束）

- `data/material.schema.ts` - 素材数据模型
  - 使用 Zod 定义 Material 的 schema

- `data/manifest.json` - 资产清单数据文件（运行时数据，OSS 模式存储在 OSS）
- `data/materials.json` - 素材清单数据文件（运行时数据，OSS 模式存储在 OSS）

### `/types` - TypeScript 类型定义

**职责**：全局类型声明和第三方库类型扩展

### `/scripts` - 构建和工具脚本（必需）

**职责**：自动化脚本、构建工具、一致性校验脚本

**重要性**：脚本是降低人为失误的必需手段，必须小而清晰

**关键脚本**：
- `scripts/build_manifest.ts` - 扫描资产文件并生成 manifest.json
- `scripts/check-supabase.ts` - 检查 Supabase 配置
- `scripts/health-check.ts` - 健康检查脚本（针对前端/OSS）
- `scripts/check-env.ts` - 环境变量校验脚本（必需）

### `/backend-legacy` - 历史遗留后端服务（Frozen）

**状态**：Frozen（冻结）/ Deprecated（已弃用），不纳入路线图

**说明**：
- 包含旧的 NestJS 后端服务代码，已冻结
- 不做运维、不做健康检查、不纳入路线图
- 未来如果体量/需求确实出现再评估
- 前端代码中可能仍存在对后端服务的调用（通过 `lib/backend-client.ts`），但这些调用应为可选功能，不影响核心功能

### `/public` - 静态资源

**职责**：静态文件（图片、视频、图标等）

## 关键入口文件说明

### 前端入口

1. **`app/layout.tsx`**
   - Next.js 根布局
   - 配置全局 metadata、CDN base URL、存储模式
   - 注入客户端全局变量

2. **`app/page.tsx`**
   - 首页路由（`/`）

3. **`next.config.ts`**
   - Next.js 配置文件

### 数据入口

1. **`lib/storage.ts`**
   - **最重要的数据访问抽象层**
   - 所有资产数据的读写都通过此文件
   - 根据 `STORAGE_MODE` 环境变量选择存储后端（local/OSS）
   - 线上环境强制使用 OSS（用于展示必需数据）

2. **`lib/materials-data.ts`**
   - 素材数据的访问层

3. **`data/manifest.schema.ts`**
   - 数据模型的"宪法"
   - 修改此文件会影响整个系统的数据结构
   - 包含 NAS 路径字段定义（核心约束）

### 认证入口

1. **`lib/auth-config.ts`**
   - NextAuth 的核心配置

2. **`app/api/auth/[...nextauth]/route.ts`**
   - NextAuth API 路由处理器

## 模块之间的依赖关系

### 数据流

```
用户请求
  ↓
Next.js 页面 (app/*)
  ↓
组件 (components/*)
  ↓
数据访问层 (lib/data.ts, lib/materials-data.ts)
  ↓
存储抽象层 (lib/storage.ts, lib/materials-data.ts)
  ↓
存储后端 (OSS - 用于 manifest/materials/预览/缩略图等展示必需数据)
  ↓
用户获取 NAS 路径信息 → 从 NAS 获取实际资产文件（主要取用来源）
```

### 认证流

```
用户登录请求
  ↓
NextAuth API (app/api/auth/[...nextauth]/route.ts)
  ↓
认证配置 (lib/auth-config.ts)
  ↓
验证用户凭据 (环境变量 / Supabase)
  ↓
生成会话 (NextAuth Session)
  ↓
保护的路由和 API (使用 lib/auth.ts 检查会话)
```

## 高风险改动区（High-Risk Areas）

### 🔴 存储相关

**核心文件**：
- `lib/storage.ts` - 存储抽象层核心
- `lib/materials-data.ts` - 素材存储实现
- `lib/oss-client.ts` - OSS 客户端封装

**职责**：
- 资产和素材数据的读写（OSS 用于展示必需数据）
- OSS 存储管理（manifest/materials/预览/缩略图）
- 缓存管理

**修改风险**：
- 修改可能导致数据丢失或访问失败
- 线上环境必须使用 OSS，配置错误会导致功能失效

**修改建议**：
- 必须充分测试 OSS 模式
- 修改前备份数据

---

### 🔴 权限/鉴权相关

**核心文件**：
- `lib/auth-config.ts` - NextAuth 配置
- `lib/auth.ts` - 认证工具函数
- `app/api/auth/[...nextauth]/route.ts` - NextAuth API 路由

**职责**：
- 用户登录认证
- 会话管理
- 权限验证

**修改风险**：
- 修改可能导致所有用户无法登录
- 影响所有受保护的路由和 API

**修改建议**：
- 修改前在测试环境充分验证
- 确保环境变量配置正确

---

### 🔴 数据库 Schema 相关

**核心文件**：
- `data/manifest.schema.ts` - 资产数据模型
- `data/material.schema.ts` - 素材数据模型

**职责**：
- 定义数据结构
- 数据验证规则
- **NAS 路径字段定义**（`guangzhouNas`、`shenzhenNas` 是核心约束）

**修改风险**：
- 修改可能导致现有数据无法解析
- 不兼容的修改可能破坏数据完整性
- NAS 路径字段是系统核心约束，修改需谨慎

**修改建议**：
- 使用 Zod 的向后兼容特性（`.optional()`, `.default()`）
- 编写数据迁移脚本（如有必要）
- 在测试环境验证数据兼容性

---

## 高风险修改区（详细说明）

### 🔴 极高风险 - 绝对谨慎

1. **`lib/storage.ts`**
   - **风险**：存储抽象层的核心，修改可能导致数据丢失或访问失败
   - **影响范围**：所有资产和素材的读写操作

2. **`lib/auth-config.ts`**
   - **风险**：认证系统核心，修改可能导致所有用户无法登录
   - **影响范围**：整个系统的用户认证

3. **`data/manifest.schema.ts`** 和 **`data/material.schema.ts`**
   - **风险**：数据模型定义，修改可能导致现有数据无法解析
   - **影响范围**：所有使用这些数据的地方
   - **特别关注**：NAS 路径字段是核心约束

### 🟡 高风险 - 需要仔细评估

4. **`app/layout.tsx`**
   - **风险**：全局配置，修改可能影响所有页面

5. **`next.config.ts`**
   - **风险**：构建配置，修改可能导致构建失败

### 🟢 中等风险 - 可适度修改

6. **API 路由** (`app/api/*`)
   - **风险**：API 接口变更需要同步更新前端调用

7. **组件层** (`components/*`)
   - **风险**：UI 变更，相对安全

8. **工具函数** (`lib/utils.ts`)
   - **风险**：工具函数变更可能影响多个调用方

## 模块独立性评估

### 高度独立（可单独修改）

- `components/ui/` - 基础 UI 组件
- `scripts/` - 构建脚本
- `types/` - 类型定义

### 中等独立（需要关注依赖）

- `components/dream-factory/` - 即梦工厂组件，依赖 AI API（AI 是主价值模块）
- `lib/ai/` - AI 功能，依赖外部服务

### 高度耦合（修改需谨慎）

- `lib/storage.ts` - 被多个模块依赖
- `lib/data.ts` - 依赖 storage.ts，被页面层依赖
- `data/*.schema.ts` - 被数据访问层和 API 层依赖

---

## 变更记录

### 2024-XX-XX（本次修订 - 二次纠偏）

1. **backend-legacy 状态明确**：
   - 明确标注为 Frozen/Deprecated，不纳入路线图
   - 缩短描述，只保留"未来如果体量/需求确实出现再评估"一句话
   - 构建系统排除它

2. **数据流补充 NAS 路径说明**：
   - 在数据流中明确：用户获取 NAS 路径信息 → 从 NAS 获取实际资产文件（主要取用来源）
   - 明确 OSS 用于 manifest/materials/预览/缩略图等展示必需数据

3. **脚本重要性说明**：
   - 明确脚本是必需的，用于降低人为失误
   - 强调脚本必须"小而清晰"

4. **AI 模块分层标注**：
   - 资产库 AI：辅助能力（可有可无）
   - 即梦工厂 AI：主价值模块（AI 是主流程）
