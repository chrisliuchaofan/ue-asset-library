# ECS 后端迁移记录

## 概述

本文档记录了从 ECS 后端迁移到 Supabase 的详细过程。ECS 后端已完全移除，所有功能已迁移到 Supabase。

## 迁移日期

2024年（具体日期待填写）

## 已完成的迁移

### 1. 积分系统 ✅

**原实现**：使用 ECS 后端的 `/credits/consume` 等接口

**新实现**：
- 积分扣除：使用 `lib/credits.ts` 中的 `consumeCredits()` 函数，调用 Supabase `deduct_credits` RPC 函数
- 积分余额：使用 `lib/credits.ts` 中的 `getCreditsBalance()` 函数，直接从 `profiles.credits` 读取
- 积分增加：使用 `lib/credits.ts` 中的 `addCredits()` 函数，调用 Supabase `add_credits` RPC 函数
- 积分交易记录：存储在 `credit_transactions` 表中

**涉及文件**：
- `lib/credits.ts` - 新建，统一积分操作函数
- `app/api/backend/credits/balance/route.ts` - 已迁移到 Supabase
- `app/api/ai/generate-image/route.ts` - 已迁移
- `app/api/ai/generate-job/route.ts` - 已迁移
- `app/api/ai/analyze-image/route.ts` - 已迁移
- `app/api/ai/generate-text/route.ts` - 已迁移

### 2. AI 功能 ✅

**原实现**：调用 ECS 后端的 `/ai/generate-image`、`/ai/generate-video` 等接口

**新实现**：
- 所有 AI 功能直接调用第三方 AI API（通过 `lib/ai/ai-service.ts`）
- 积分扣除在调用 AI API 之前完成
- 不再依赖 ECS 后端进行 AI 处理

**涉及文件**：
- `app/api/ai/generate-image/route.ts` - 移除后端调用，直接使用 aiService
- `app/api/ai/generate-job/route.ts` - 移除后端调用，直接使用 aiService
- `app/api/ai/generate-text/route.ts` - 移除后端调用，直接使用 aiService

### 3. 用户信息 ✅

**原实现**：从 ECS 后端获取用户信息

**新实现**：
- 用户信息从 Supabase `profiles` 表读取
- `app/api/me/route.ts` 已迁移到 Supabase

### 4. 积分兑换码功能 ⚠️

**状态**：暂时不考虑，接口已禁用

**涉及文件**：
- `app/api/credits/redeem/route.ts` - 已标记为禁用（返回 501）
- `app/api/credits/admin/redeem-codes/` - 这些文件仍存在，但功能已禁用

**说明**：如需启用，需要：
1. 在 Supabase 中创建兑换码表
2. 实现兑换码生成、验证、使用等逻辑
3. 与积分系统集成

### 5. 项目管理功能 ⚠️

**状态**：待迁移到 Supabase

**当前状态**：
- 项目管理表已在 Supabase 创建，但无数据
- API 接口已标记为待迁移，当前返回空数组或 501 错误

**涉及文件**：
- `app/api/projects/route.ts` - 已标记为待迁移
- `app/api/projects/[id]/route.ts` - 已标记为待迁移
- `app/api/projects/migrate/route.ts` - 仍存在，但需要迁移

**待完成工作**：
1. 确认 Supabase `projects` 表的结构
2. 更新 `lib/supabase/types.ts` 中的类型定义
3. 实现从 Supabase 读取、创建、更新、删除项目的逻辑
4. 移除对 ECS 后端的调用

## 已废弃的文件

以下文件已标记为废弃，不应再使用：

- `lib/backend-client.ts` - 已添加 `@deprecated` 注释
- `lib/backend-api-client.ts` - 已添加 `@deprecated` 注释

**注意**：这些文件暂时保留以保持向后兼容，但不应在新代码中使用。

## Supabase 表结构

### profiles 表
- `id` (string) - 用户 ID
- `email` (string) - 邮箱
- `credits` (number) - 积分余额
- `created_at` (string) - 创建时间
- `updated_at` (string) - 更新时间

### credit_transactions 表
- `id` (string) - 交易 ID
- `user_id` (string) - 用户 ID
- `amount` (number) - 金额（正数表示增加，负数表示扣除）
- `type` (string) - 类型（如 'CONSUME', 'RECHARGE'）
- `description` (string) - 描述
- `ref_id` (string) - 关联 ID（用于幂等性检查）
- `metadata` (json) - 元数据
- `created_at` (string) - 创建时间

### Supabase RPC 函数

- `deduct_credits(p_user_id, p_cost)` - 扣除积分，返回新余额
- `add_credits(p_user_id, p_amount)` - 增加积分，返回新余额

## 环境变量变更

### 已移除的环境变量（不再需要）

- `BACKEND_API_URL` - ECS 后端 API URL
- `NEXT_PUBLIC_BACKEND_API_URL` - ECS 后端 API URL（公开）
- `BACKEND_TEST_PASSWORD` - 后端测试密码
- `BACKEND_TEST_EMAIL` - 后端测试邮箱

### 必需的环境变量

- `NEXT_PUBLIC_SUPABASE_URL` - Supabase 项目 URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase 匿名密钥
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase 服务角色密钥（用于服务端操作）

## 迁移检查清单

- [x] 积分扣除功能迁移到 Supabase
- [x] 积分余额查询迁移到 Supabase
- [x] AI 功能移除后端调用
- [x] 用户信息查询迁移到 Supabase
- [x] 标记积分兑换码功能为暂时不考虑
- [x] 标记项目管理功能为待迁移
- [x] 标记后端客户端文件为废弃
- [ ] 项目管理功能完全迁移到 Supabase（待完成）
- [ ] 移除所有对 `backend-client.ts` 和 `backend-api-client.ts` 的引用（待完成）

## 注意事项

1. **向后兼容**：后端客户端文件暂时保留，但不应在新代码中使用
2. **项目管理**：项目管理功能需要确认 Supabase 表结构后才能完全迁移
3. **积分兑换码**：如需要启用，需要先实现 Supabase 表结构和相关逻辑
4. **错误处理**：所有错误处理应使用统一的错误处理函数（`lib/errors/error-handler.ts`）

## 相关文档

- `lib/credits.ts` - 积分操作函数文档
- `lib/supabase/types.ts` - Supabase 类型定义
- `lib/supabase/admin.ts` - Supabase Admin Client
- `lib/supabase/server.ts` - Supabase Server Client

