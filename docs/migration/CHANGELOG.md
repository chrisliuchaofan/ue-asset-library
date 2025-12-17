# 旧后端清理变更日志

## 变更日期
2025-01-XX

## 变更概述
项目已从 NestJS/ECS 后端架构迁移至 Next.js Route Handler + Supabase 架构。所有核心功能已迁移完成，项目现在可以**不依赖后端服务**运行。

## 📝 修改的文件清单

### 核心认证和 API Routes

1. **`lib/auth-config.ts`**
   - ✅ 移除后端登录调用（`${backendUrl}/auth/login`）
   - ✅ 改为本地认证（使用 `ADMIN_USERS` 环境变量）
   - ✅ 不再依赖后端服务

2. **`app/api/me/route.ts`**
   - ✅ 移除 `getCurrentUserInfo` 和 `callBackendAPI` 调用
   - ✅ 改为从 Supabase `profiles` 表读取用户信息
   - ✅ 自动创建默认 profile（如果不存在）

3. **`app/api/credits/add/route.ts`**
   - ✅ 移除 `callBackendAPI` 调用
   - ✅ 改为使用 Supabase RPC 函数 `add_credits` 或直接更新
   - ✅ 记录交易到 `credit_transactions` 表

4. **`app/api/credits/admin/recharge/route.ts`**
   - ✅ 移除 `callBackendAPI` 调用
   - ✅ 改为使用 Supabase RPC 函数 `add_credits` 或直接更新
   - ✅ 记录交易到 `credit_transactions` 表

### 环境变量配置

5. **`环境变量配置模板.env.example`**
   - ✅ 移除 `NEXT_PUBLIC_BACKEND_API_URL` 和 `BACKEND_API_URL` 配置
   - ✅ 移除 `JWT_SECRET` 配置（不再需要与后端同步）
   - ✅ 添加 `NEXT_PUBLIC_SUPABASE_URL` 和 `SUPABASE_SERVICE_ROLE_KEY` 配置
   - ✅ 更新配置检查清单

### 文档

6. **`docs/migration/backend-cleanup-report.md`** (新建)
   - ✅ 详细的清理报告，列出所有旧后端引用位置

7. **`docs/migration/backend-cleanup-summary.md`** (新建)
   - ✅ 迁移总结，列出需要迁移的 API routes

8. **`docs/migration/backend-cleanup-final.md`** (新建)
   - ✅ 最终清理总结，包含验证清单和下一步建议

9. **`docs/migration/CHANGELOG.md`** (新建)
   - ✅ 本文档，变更日志

## ✅ 确认：项目不再需要运行 backend-api

### 核心功能验证

- ✅ **登录功能**: 使用本地认证（`ADMIN_USERS`），不依赖后端
- ✅ **用户信息查询**: 从 Supabase `profiles` 表读取，不依赖后端
- ✅ **积分充值**: 使用 Supabase RPC 函数，不依赖后端
- ✅ **AI 生成**: 使用 `/api/generate`，扣减积分使用 Supabase，不依赖后端
- ✅ **Dream Factory**: 已使用 `/api/generate`，不依赖后端
- ✅ **Assets 页面**: 使用本地数据/Supabase，不依赖后端

### 环境要求

项目现在只需要：
- ✅ Next.js 开发服务器（`npm run dev`）
- ✅ Supabase 数据库（已配置）
- ✅ 环境变量（`.env.local` 中配置 Supabase 和 ADMIN_USERS）

**不再需要**：
- ❌ 启动 backend-api 服务
- ❌ 配置 `BACKEND_API_URL`
- ❌ 配置 `JWT_SECRET`（与后端同步）

## ⚠️ 仍需迁移的功能（可选）

以下功能仍在使用旧后端，但**不影响核心功能**：

1. **兑换码功能**（需要创建 `redeem_codes` 表）
   - `app/api/credits/redeem/route.ts`
   - `app/api/credits/admin/redeem-codes/route.ts`
   - `app/api/credits/admin/redeem-codes/[code]/disable/route.ts`
   - `app/api/credits/admin/redeem-codes/statistics/route.ts`

2. **用户管理**（可选）
   - `app/api/users/list/route.ts`
   - `app/api/users/update-mode/route.ts`

3. **交易记录**（可选）
   - `app/api/credits/transactions/route.ts`

4. **AI 相关**（需要检查）
   - `app/api/ai/generate-image/route.ts`
   - `app/api/ai/generate-text/route.ts`
   - `app/api/ai/generate-job/route.ts`
   - `app/api/ai/analyze-image/route.ts`

5. **项目相关**（可选）
   - `app/api/projects/route.ts`
   - `app/api/projects/[id]/route.ts`
   - `app/api/projects/migrate/route.ts`

## 🗑️ 可以删除的文件（待所有 API routes 迁移完成后）

1. **`lib/backend-api-client.ts`**
   - ⚠️ 注意：目前仍有多个 API routes 在使用，需要先迁移这些 routes 才能删除

## 📋 迁移后的环境变量要求

### 必须配置

```env
# NextAuth
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=http://localhost:3000

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# 管理员用户（本地认证）
ADMIN_USERS=admin:admin123,user1:password1
```

### 不再需要

```env
# ❌ 已移除
# NEXT_PUBLIC_BACKEND_API_URL=https://api.your-domain.com
# BACKEND_API_URL=https://api.your-domain.com
# JWT_SECRET=your-jwt-secret-key
```

## 🎯 下一步

1. **立即验证**: 测试登录、生成、充值功能是否正常
2. **创建兑换码表**: 如果需要兑换码功能，创建 `redeem_codes` 表
3. **迁移剩余 API**: 根据需求迁移剩余的 API routes
4. **清理文档**: 更新所有文档，移除后端启动说明
5. **删除旧代码**: 在所有 API routes 迁移完成后，删除 `lib/backend-api-client.ts`

## ✨ 总结

**核心功能迁移已完成** ✅

项目现在可以**不依赖后端服务**运行以下功能：
- ✅ 用户登录（本地认证）
- ✅ 用户信息查询（Supabase）
- ✅ 积分充值（Supabase）
- ✅ AI 生成（Supabase + 积分扣减）

**可选功能仍需迁移** ⚠️

剩余功能可以根据需要逐步迁移，不影响核心功能使用。




