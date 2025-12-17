# 旧后端清理总结

## ✅ 已完成迁移

### 1. 认证系统
- ✅ `lib/auth-config.ts` - 已改为本地认证（使用 ADMIN_USERS），不再调用后端登录接口

### 2. 用户信息 API
- ✅ `app/api/me/route.ts` - 已迁移至 Supabase，从 `profiles` 表读取用户信息

### 3. 积分管理 API
- ✅ `app/api/credits/add/route.ts` - 已迁移至 Supabase，使用 RPC 函数或直接更新
- ✅ `app/api/credits/admin/recharge/route.ts` - 已迁移至 Supabase

### 4. 生成 API
- ✅ `app/api/generate/route.ts` - 已使用 Supabase（之前已迁移）
- ✅ `app/dream-factory/page.tsx` - 已使用 `/api/generate`（无需修改）

## ⚠️ 需要迁移的 API Routes

以下 API routes 仍在使用 `callBackendAPI`，需要迁移至 Supabase：

### 高优先级（常用功能）

1. **`app/api/credits/redeem/route.ts`**
   - 功能：兑换码充值
   - 需要：创建 `redeem_codes` 表（如果不存在）
   - 迁移方案：使用 Supabase 查询和更新

2. **`app/api/credits/transactions/route.ts`**
   - 功能：查询积分交易记录
   - 需要：查询 `credit_transactions` 表
   - 迁移方案：直接查询 Supabase

3. **`app/api/users/list/route.ts`**
   - 功能：用户列表
   - 需要：查询 `profiles` 表
   - 迁移方案：直接查询 Supabase

4. **`app/api/users/update-mode/route.ts`**
   - 功能：更新用户模式
   - 需要：更新 `profiles` 表的模式字段（如果存在）
   - 迁移方案：直接更新 Supabase

### 中优先级（管理功能）

5. **`app/api/credits/admin/redeem-codes/route.ts`**
   - 功能：管理员创建/查询兑换码
   - 需要：`redeem_codes` 表
   - 迁移方案：使用 Supabase CRUD

6. **`app/api/credits/admin/redeem-codes/[code]/disable/route.ts`**
   - 功能：禁用兑换码
   - 需要：更新 `redeem_codes` 表
   - 迁移方案：直接更新 Supabase

7. **`app/api/credits/admin/redeem-codes/statistics/route.ts`**
   - 功能：兑换码统计
   - 需要：查询 `redeem_codes` 表
   - 迁移方案：使用 Supabase 聚合查询

### 低优先级（AI 相关，可能已迁移）

8. **`app/api/ai/generate-image/route.ts`**
   - 功能：AI 图片生成
   - 状态：可能已部分迁移，需要检查

9. **`app/api/ai/generate-text/route.ts`**
   - 功能：AI 文本生成
   - 状态：可能已部分迁移，需要检查

10. **`app/api/ai/generate-job/route.ts`**
    - 功能：AI 任务管理
    - 状态：可能已部分迁移，需要检查

11. **`app/api/ai/analyze-image/route.ts`**
    - 功能：AI 图片分析
    - 状态：可能已部分迁移，需要检查

### 项目相关（可选）

12. **`app/api/projects/route.ts`**
    - 功能：项目列表/创建
    - 迁移方案：如果项目数据存储在 Supabase，直接查询；否则保留为本地存储

13. **`app/api/projects/[id]/route.ts`**
    - 功能：项目详情/更新/删除
    - 迁移方案：同上

14. **`app/api/projects/migrate/route.ts`**
    - 功能：项目迁移
    - 迁移方案：同上

## 📝 需要创建的数据库表

### redeem_codes 表（如果不存在）

```sql
CREATE TABLE IF NOT EXISTS public.redeem_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  amount INTEGER NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  used_by UUID REFERENCES public.profiles(id),
  used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_redeem_codes_code ON public.redeem_codes(code);
CREATE INDEX IF NOT EXISTS idx_redeem_codes_used ON public.redeem_codes(used);
```

## 🗑️ 可以删除的文件

以下文件可以标记为废弃或删除：

1. **`lib/backend-api-client.ts`** - 旧后端客户端（在所有 API routes 迁移完成后删除）

## 📚 文档更新

以下文档需要更新，移除后端相关说明：

1. `环境变量配置模板.env.example` - 移除 `BACKEND_API_URL` 相关配置
2. `README.md` - 更新部署说明，移除后端启动步骤
3. 其他包含后端启动说明的文档（见 `docs/migration/backend-cleanup-report.md`）

## ✅ 验证清单

迁移完成后，请验证：

- [ ] 登录功能正常（使用 ADMIN_USERS）
- [ ] `/api/me` 返回正确的用户信息
- [ ] `/api/credits/add` 可以充值积分
- [ ] `/api/generate` 可以生成内容并扣减积分
- [ ] Dream Factory 页面可以正常使用
- [ ] Assets 页面可以正常访问
- [ ] 不再出现"后端服务不可用"的错误提示

## 🚀 下一步

1. 创建 `redeem_codes` 表（如果不存在）
2. 迁移兑换码相关 API routes
3. 迁移用户列表和交易记录 API
4. 检查并迁移 AI 相关 API（如果仍有后端调用）
5. 删除 `lib/backend-api-client.ts`
6. 更新文档




