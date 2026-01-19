# Archived Backend Client Files

**归档日期**: 2025-01-07  
**归档原因**: 已完全迁移到 Supabase，不再需要 ECS 后端服务器

## 归档文件

- `backend-client.ts` - 旧的 ECS 后端 API 客户端（已废弃）
- `backend-api-client.ts` - 旧的 ECS 后端 API 客户端（自动携带认证 token，已废弃）

## 说明

这两个文件已废弃，所有功能已迁移到 Supabase：

- 积分操作：使用 `lib/credits.ts` 中的函数
- 用户信息：使用 `lib/supabase/admin.ts` 或 `lib/supabase/server.ts`
- 数据操作：直接使用 Supabase client
- 用户模式信息：使用 `/api/me` 接口

## 迁移记录

- ✅ `lib/ai/dry-run-check.ts` - 已迁移到使用 `/api/me` 接口
- ✅ `app/api/credits/admin/redeem-codes/*` - 已移除对废弃代码的依赖

## 注意事项

这些文件仅作为历史记录保留，不应再使用。如果将来需要参考，请使用 Git 历史记录。
