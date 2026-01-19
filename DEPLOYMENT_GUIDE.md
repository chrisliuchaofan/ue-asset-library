# 完整部署指南

## 📋 架构概览

```
┌─────────────────────────────────┐
│      Vercel (Next.js 前端)       │
│  - 用户界面                      │
│  - NextAuth 认证                │
│  - Supabase 客户端               │
│  - OSS 文件上传                  │
└──────────────┬──────────────────┘
               │ HTTPS
               ↓
┌─────────────────────────────────┐
│      Supabase                   │
│  - PostgreSQL 数据库             │
│  - 用户认证（NextAuth）          │
│  - 积分系统                      │
│  - 资产元数据管理                │
└──────────────┬──────────────────┘
               │
               ↓
┌─────────────────────────────────┐
│      阿里云 OSS                  │
│  - 清单数据（manifest.json）     │
│  - 预览图、缩略图                │
│  - 展示必需资源                  │
└─────────────────────────────────┘
```

**注意**：项目已完全迁移到 Supabase，不再需要单独的 ECS 后端服务器。

---

## 🚀 部署步骤

### 一、Vercel 部署（Next.js 前端）

#### 1.1 准备代码

确保代码已推送到 Git 仓库（GitHub/GitLab/Bitbucket）

#### 1.2 在 Vercel 创建项目

1. 登录 [Vercel Dashboard](https://vercel.com/dashboard)
2. 点击 **Add New** → **Project**
3. 导入 Git 仓库
4. 配置项目：
   - **Framework Preset**: Next.js
   - **Root Directory**: `.`（项目根目录）
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`

#### 1.3 配置环境变量

在 Vercel Dashboard → Settings → Environment Variables 添加：

```env
# ============================================
# NextAuth 配置（必需）
# ============================================
NEXTAUTH_SECRET=your-secret-key-here
NEXTAUTH_URL=https://your-domain.vercel.app

# 管理员账号配置（格式：用户名:密码，多个用户用逗号分隔）
ADMIN_USERS=admin:admin123

# ============================================
# Supabase 配置（必需）
# ============================================
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# ============================================
# 存储模式配置
# ============================================
STORAGE_MODE=oss
NEXT_PUBLIC_STORAGE_MODE=oss

# ============================================
# 阿里云 OSS 配置（生产环境必需）
# ============================================
OSS_BUCKET=your-bucket
OSS_REGION=oss-cn-hangzhou
OSS_ACCESS_KEY_ID=your-key-id
OSS_ACCESS_KEY_SECRET=your-key-secret
NEXT_PUBLIC_OSS_BUCKET=your-bucket
NEXT_PUBLIC_OSS_REGION=oss-cn-hangzhou
NEXT_PUBLIC_CDN_BASE=https://your-cdn-domain.com

# ============================================
# AI 服务配置（可选）
# ============================================
AI_IMAGE_API_KEY=your-api-key
AI_IMAGE_API_ENDPOINT=https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions
AI_IMAGE_API_MODEL=qwen-vl-plus-latest
JIMENG_ACCESS_KEY=your-jimeng-key
JIMENG_SECRET_KEY=your-jimeng-secret
JIMENG_API_ENDPOINT=https://visual.volcengineapi.com
JIMENG_REGION=cn-north-1
```

#### 1.4 部署

点击 **Deploy**，等待部署完成

---

### 二、Supabase 配置

#### 2.1 创建 Supabase 项目

1. 登录 [Supabase Dashboard](https://supabase.com/dashboard)
2. 创建新项目
3. 记录项目 URL 和 API Key：
   - **Project URL**: `https://your-project.supabase.co`
   - **Anon Key**: 在 Settings → API 中查看
   - **Service Role Key**: 在 Settings → API 中查看（⚠️ 保密，仅在服务端使用）

#### 2.2 数据库表结构

项目使用以下 Supabase 表：

- **profiles**: 用户信息表（包括积分）
- **assets**: 资产元数据表
- **credit_transactions**: 积分交易记录表
- **generations**: AI 生成记录表（可选）
- **projects**: 项目表（可选，用于即梦工厂）

详细的数据库表结构请参考 `docs/SUPABASE_ADMIN_SETUP.md`。

#### 2.3 RPC 函数

项目使用以下 Supabase RPC 函数：

- `deduct_credits`: 扣除积分
- `add_credits`: 增加积分

RPC 函数定义请参考 `scripts/sql/` 目录中的 SQL 文件。

---

### 三、域名配置

#### 3.1 前端域名（Vercel）

1. 在 Vercel Dashboard → Settings → Domains
2. 添加域名：`your-domain.com`
3. 按照提示配置 DNS 记录

#### 3.2 更新环境变量

添加域名后，更新 `NEXTAUTH_URL` 环境变量：

```env
NEXTAUTH_URL=https://your-domain.com
```

---

### 四、测试部署

#### 4.1 测试前端连接

1. 访问 `https://your-domain.vercel.app`
2. 尝试访问 `/auth/login`，应该显示登录页
3. 使用管理员账号登录
4. 测试积分扣除功能
5. 测试资产管理功能

#### 4.2 测试 Supabase 连接

1. 在浏览器控制台执行：
```javascript
fetch('/api/check-supabase')
  .then(r => r.json())
  .then(console.log);
```

应该返回 Supabase 连接状态。

---

## 🔧 维护命令

### 查看日志

在 Vercel Dashboard → Deployments → 选择部署 → View Function Logs

### 环境变量更新

1. 在 Vercel Dashboard → Settings → Environment Variables
2. 更新环境变量
3. 重新部署（Vercel 会自动触发重新部署，或手动点击 Redeploy）

---

## ⚠️ 注意事项

1. **环境变量同步**：确保所有环境变量已正确配置
2. **Supabase 密钥安全**：
   - `SUPABASE_SERVICE_ROLE_KEY` 仅在服务端使用，不要暴露到客户端
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` 可以暴露到客户端
3. **存储模式**：
   - 生产环境必须使用 `oss` 模式
   - `local` 模式仅用于本地开发调试
4. **HTTPS**：生产环境必须使用 HTTPS
5. **密钥安全**：不要将密钥提交到 Git

---

## 📊 监控建议

1. **Vercel 监控**：在 Vercel Dashboard 查看部署状态和函数日志
2. **Supabase 监控**：在 Supabase Dashboard 查看数据库使用情况和 API 调用
3. **错误追踪**：集成 Sentry 或类似服务
4. **日志收集**：使用 Vercel Logs 或类似工具

---

## 🔄 从旧架构迁移

如果你之前使用的是 ECS 后端架构，迁移步骤：

1. ✅ **数据迁移**：将所有数据迁移到 Supabase
   - 用户数据 → `profiles` 表
   - 资产元数据 → `assets` 表
   - 积分交易记录 → `credit_transactions` 表

2. ✅ **环境变量更新**：移除 ECS 相关配置，添加 Supabase 配置

3. ✅ **代码清理**：移除对后端 API 的依赖（已自动完成）

4. ✅ **重新部署**：在 Vercel 重新部署项目

详细的迁移指南请参考 `docs/ECS_BACKEND_MIGRATION.md`。

---

## 📚 相关文档

- `docs/ENV_VARIABLES.md` - 环境变量完整说明
- `docs/SUPABASE_ADMIN_SETUP.md` - Supabase 配置指南
- `docs/ECS_BACKEND_MIGRATION.md` - 从 ECS 后端迁移指南
- `docs/PROJECT_CONTEXT.md` - 项目架构说明
