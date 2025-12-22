# Supabase 管理员配置指南

## 概述

系统已迁移到从 Supabase 数据库读取管理员权限，而不是依赖环境变量。这样可以在数据库中直接管理管理员，无需重新部署。

**✅ 确认：用户管理功能已经完全基于 Supabase**
- 用户列表：从 `profiles` 表读取
- 用户创建：在 Supabase Auth + `profiles` 表创建
- 用户更新：更新 `profiles` 表（包括积分、billing_mode、model_mode）
- 用户删除：删除 Supabase Auth 用户（自动级联删除 profile）

## 数据库字段配置

### 方法 1：使用 `is_admin` 字段（推荐）

在 Supabase Dashboard → Table Editor → `profiles` 表中添加字段：

1. **字段名**: `is_admin`
2. **类型**: `boolean`
3. **默认值**: `false`
4. **是否可为空**: `否`（NOT NULL）

**SQL 迁移脚本**：
```sql
-- 添加 is_admin 字段（如果还没有）
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false NOT NULL;

-- 将现有管理员设置为 true（根据你的实际管理员 email 修改）
UPDATE profiles 
SET is_admin = true 
WHERE email IN ('admin@admin.local', 'your-admin@example.com');
```

### 方法 2：使用 `role` 字段

如果你已经有 `role` 字段，可以设置 `role = 'admin'`：

```sql
-- 将现有管理员设置为 admin 角色
UPDATE profiles 
SET role = 'admin' 
WHERE email IN ('admin@admin.local', 'your-admin@example.com');
```

## 在 Supabase Dashboard 中操作

### 步骤 1：添加字段

1. 登录 [Supabase Dashboard](https://app.supabase.com)
2. 选择你的项目
3. 进入 **Table Editor** → **profiles** 表
4. 点击 **Add Column**
5. 填写：
   - **Name**: `is_admin`
   - **Type**: `bool`
   - **Default value**: `false`
   - **Is nullable**: 取消勾选（NOT NULL）
6. 点击 **Save**

### 步骤 2：设置管理员

1. 在 `profiles` 表中找到要设置为管理员的用户
2. 点击编辑该行
3. 将 `is_admin` 设置为 `true`
4. 保存

或者使用 SQL Editor：

```sql
-- 查看所有用户
SELECT id, email, is_admin FROM profiles;

-- 设置某个用户为管理员
UPDATE profiles 
SET is_admin = true 
WHERE email = 'your-admin@example.com';

-- 取消管理员权限
UPDATE profiles 
SET is_admin = false 
WHERE email = 'user@example.com';
```

## 回退方案

如果 Supabase 中没有 `is_admin` 或 `role` 字段，系统会自动回退到使用 `ADMIN_USERS` 环境变量。

**环境变量格式**（仅在回退时使用）：
```
ADMIN_USERS=admin:admin123,user2:password2
```

## 验证配置

部署后，在浏览器控制台（F12）中应该看到：

- `[isAdmin] ✅ 从 Supabase 读取：用户是管理员` - 表示从数据库读取成功
- `[isAdmin] Supabase 中没有管理员字段，回退到环境变量` - 表示需要添加字段

## 优势

1. **无需重新部署**：在数据库中修改管理员，立即生效
2. **更安全**：不需要在环境变量中暴露管理员列表
3. **更灵活**：可以在用户管理页面直接设置管理员权限
4. **统一管理**：所有用户信息都在 Supabase 中管理

## 后续优化建议

可以在用户管理页面添加"设置为管理员"功能，直接在 UI 中管理，无需手动修改数据库。

