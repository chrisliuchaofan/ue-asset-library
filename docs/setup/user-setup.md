# 用户和积分设置指南

## 📋 概述

数据库表结构已创建完成，现在需要初始化用户数据和积分。

## 🚀 快速设置步骤

### 步骤 1：初始化测试用户

在 Supabase Dashboard 的 SQL Editor 中执行：

```sql
-- 执行 scripts/sql/init-test-users.sql
```

这将创建以下测试用户：
- **admin** (`admin@admin.local`) - 1000 积分
- **test1** (`test1@admin.local`) - 500 积分
- **test2** (`test2@admin.local`) - 200 积分

### 步骤 2：验证用户创建

执行以下 SQL 查询，确认用户已创建：

```sql
SELECT id, email, username, credits, created_at 
FROM public.profiles 
ORDER BY created_at DESC;
```

### 步骤 3：测试生成 API

使用测试用户测试生成功能：

```bash
# 使用 admin 用户测试（1000 积分）
curl -X POST http://localhost:3000/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "生成一张美丽的风景图",
    "userId": "00000000-0000-0000-0000-000000000001",
    "cost": 10
  }'
```

## 📝 手动创建用户

如果需要手动创建用户，可以使用以下 SQL：

```sql
-- 创建新用户
INSERT INTO public.profiles (id, email, username, credits, created_at, updated_at)
VALUES (
  gen_random_uuid(), -- 自动生成 UUID
  'user@example.com',
  'username',
  1000, -- 初始积分
  NOW(),
  NOW()
);
```

## 💰 管理用户积分

### 查看用户积分

```sql
SELECT id, email, username, credits 
FROM public.profiles 
WHERE email = 'admin@admin.local';
```

### 给用户充值积分

```sql
-- 方法1：直接更新
UPDATE public.profiles
SET credits = credits + 100
WHERE email = 'admin@admin.local';

-- 方法2：使用 RPC 函数（推荐）
SELECT public.add_credits(
  '00000000-0000-0000-0000-000000000001'::UUID, -- 用户 ID
  100 -- 充值金额
);
```

### 查看积分交易记录

```sql
SELECT 
  ct.id,
  ct.user_id,
  p.email,
  ct.amount,
  ct.type,
  ct.description,
  ct.created_at
FROM public.credit_transactions ct
JOIN public.profiles p ON ct.user_id = p.id
ORDER BY ct.created_at DESC
LIMIT 20;
```

## 🔧 与后端 API 集成

如果你的项目使用后端 API 管理用户，需要确保：

1. **后端创建用户时同步创建 profiles 记录**
2. **后端充值接口使用 Supabase RPC 函数**

示例后端代码（Node.js）：

```typescript
import { supabaseAdmin } from '@/lib/supabase/admin';

// 创建用户
async function createUser(email: string, username: string, initialCredits: number = 100) {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .insert({
      id: crypto.randomUUID(),
      email,
      username,
      credits: initialCredits,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();
  
  return { data, error };
}

// 充值积分
async function rechargeCredits(userId: string, amount: number) {
  const { data, error } = await supabaseAdmin.rpc('add_credits', {
    p_user_id: userId,
    p_amount: amount,
  });
  
  return { data, error };
}
```

## 🧪 测试生成功能

### 1. 测试匿名生成（不扣费）

```bash
curl -X POST http://localhost:3000/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "生成一张美丽的风景图",
    "userId": null
  }'
```

### 2. 测试用户生成（扣费）

```bash
curl -X POST http://localhost:3000/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "生成一张美丽的风景图",
    "userId": "00000000-0000-0000-0000-000000000001",
    "cost": 10
  }'
```

### 3. 测试积分不足

```bash
# 先设置用户积分为 5
UPDATE public.profiles
SET credits = 5
WHERE email = 'test2@admin.local';

# 然后尝试生成（需要 10 积分）
curl -X POST http://localhost:3000/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "生成一张美丽的风景图",
    "userId": "00000000-0000-0000-0000-000000000003",
    "cost": 10
  }'
```

应该返回 402 错误（积分不足）。

## 📊 查看生成记录

```sql
-- 查看所有生成记录
SELECT 
  g.id,
  g.user_id,
  p.email,
  g.prompt,
  g.status,
  g.cost,
  g.result_url,
  g.created_at,
  g.completed_at
FROM public.generations g
LEFT JOIN public.profiles p ON g.user_id = p.id
ORDER BY g.created_at DESC
LIMIT 20;
```

## 🔍 常见问题

### Q: 用户登录后没有积分？

A: 确保用户登录时，后端会创建或更新 `profiles` 表中的记录，并设置初始积分。

### Q: 如何重置用户积分？

```sql
UPDATE public.profiles
SET credits = 1000
WHERE email = 'admin@admin.local';
```

### Q: 如何查看用户的完整交易历史？

```sql
SELECT 
  ct.*,
  p.email,
  p.username
FROM public.credit_transactions ct
JOIN public.profiles p ON ct.user_id = p.id
WHERE p.email = 'admin@admin.local'
ORDER BY ct.created_at DESC;
```

## ✅ 完成检查清单

- [ ] 执行 `init-test-users.sql` 创建测试用户
- [ ] 验证用户已创建（查询 profiles 表）
- [ ] 测试生成 API（匿名模式）
- [ ] 测试生成 API（用户模式，扣费）
- [ ] 测试积分不足场景
- [ ] 查看生成记录和交易记录

