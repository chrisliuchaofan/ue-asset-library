# 项目优化开发计划

**创建日期**: 2025-01-07  
**基于报告**: PROJECT_AUDIT_REPORT.md  
**执行状态**: 进行中

---

## 优化目标

根据项目检查报告，对项目进行系统性优化，主要目标：
1. **清理遗留代码**：移除或归档废弃的后端客户端代码
2. **更新文档**：确保文档与当前架构一致
3. **完善功能**：完成待迁移功能（如项目管理）

---

## 优先级分类

### 🔴 高优先级（立即执行）

#### 1. 更新部署文档 ✅
- **任务**: 更新 `DEPLOYMENT_GUIDE.md`，移除 ECS 后端相关章节
- **原因**: 架构已完全迁移到 Supabase，文档与实际不符
- **影响**: 避免误导开发者，确保部署流程正确

#### 2. 检查废弃代码使用情况 ⚠️
- **任务**: 检查 `backend-client.ts` 和 `backend-api-client.ts` 的所有引用
- **文件**:
  - `lib/backend-client.ts`
  - `lib/backend-api-client.ts`
- **检查范围**: 
  - 代码中的 import 语句
  - 实际使用情况
  - 是否可以安全移除

#### 3. 清理废弃代码 ⚠️
- **任务**: 移除或归档废弃的后端客户端代码
- **选项**:
  - 如果无使用：删除文件
  - 如果仍有使用：迁移到 Supabase，然后删除
  - 或移动到 `backend-legacy/` 目录归档

### 🟡 中优先级（近期完成）

#### 4. 更新环境变量文档
- **任务**: 更新 `ENV_VARIABLES.md`，移除过时配置
- **需要移除**:
  - `BACKEND_API_URL`
  - `NEXT_PUBLIC_BACKEND_API_URL`
- **需要添加**:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`

#### 5. 完善项目管理功能
- **任务**: 完成项目管理 API 的 Supabase 迁移
- **文件**:
  - `app/api/projects/route.ts`
  - `app/api/projects/[id]/route.ts`
- **需要确认**:
  - Supabase `projects` 表的结构
  - 实现 CRUD 操作

### 🟢 低优先级（可选）

#### 6. 构建配置优化
- **任务**: 确保 `next.config.ts` 排除 `backend-legacy` 目录
- **目的**: 优化构建速度，减少不必要的文件

---

## 执行计划

### 阶段 1：文档更新（立即执行）

1. ✅ 更新 `DEPLOYMENT_GUIDE.md`
   - 移除 ECS 后端部署章节
   - 只保留 Vercel 部署说明
   - 更新架构图，移除后端服务器

2. ⏳ 更新 `ENV_VARIABLES.md`
   - 移除废弃环境变量
   - 添加 Supabase 配置说明
   - 更新配置检查清单

### 阶段 2：代码清理（立即执行）

3. ⏳ 检查废弃代码引用
   - 搜索所有使用 `backend-client.ts` 和 `backend-api-client.ts` 的地方
   - 确认是否可以安全移除

4. ⏳ 清理废弃代码
   - 如果无使用：删除文件
   - 如果仍有使用：先迁移，再删除

### 阶段 3：功能完善（近期完成）

5. ⏳ 完善项目管理功能
   - 确认 Supabase `projects` 表结构
   - 实现项目的 CRUD 操作
   - 测试功能完整性

---

## 执行记录

### 2025-01-07

#### 阶段 1：文档更新 ✅ 完成
- ✅ 创建优化计划文档
- ✅ 更新 `DEPLOYMENT_GUIDE.md`
  - 移除 ECS 后端部署章节
  - 只保留 Vercel 部署说明
  - 更新架构图，移除后端服务器
  - 添加 Supabase 配置说明
- ✅ 更新 `ENV_VARIABLES.md`
  - 移除废弃环境变量（`BACKEND_API_URL`、`NEXT_PUBLIC_BACKEND_API_URL`、`JWT_SECRET`、`FRONTEND_URL`、`USER_WHITELIST`、`INITIAL_CREDITS`）
  - 添加 Supabase 配置说明（`NEXT_PUBLIC_SUPABASE_URL`、`NEXT_PUBLIC_SUPABASE_ANON_KEY`、`SUPABASE_SERVICE_ROLE_KEY`）
  - 更新配置检查清单
  - 添加废弃变量说明

#### 阶段 2：代码清理 ✅ 完成
- ✅ 检查废弃代码引用
  - 确认 `backend-client.ts` 和 `backend-api-client.ts` 已无使用
  - 迁移 `lib/ai/dry-run-check.ts` 到使用 `/api/me` 接口
  - 清理兑换码路由中的废弃代码依赖
- ✅ 清理废弃代码
  - 将 `lib/backend-client.ts` 移动到 `backend-legacy/archived/`
  - 将 `lib/backend-api-client.ts` 移动到 `backend-legacy/archived/`
  - 创建归档说明文档 `backend-legacy/archived/README.md`
- ✅ 构建配置检查
  - 确认 `tsconfig.json` 已排除 `backend-legacy` 目录
  - 无需在 `next.config.ts` 中额外排除

#### 阶段 3：功能完善 ⏳ 待完成
- ⏳ 完善项目管理功能
  - 需要确认 Supabase `projects` 表结构
  - 需要实现项目的 CRUD 操作

---

## 已完成工作总结

### ✅ 高优先级任务（全部完成）

1. **✅ 更新部署文档**
   - `DEPLOYMENT_GUIDE.md` 已完全更新，移除所有 ECS 后端相关章节
   - 添加 Supabase 配置说明
   - 更新架构图和部署步骤

2. **✅ 检查废弃代码使用情况**
   - 确认所有引用已清理或迁移
   - `lib/ai/dry-run-check.ts` 已迁移到使用 `/api/me` 接口
   - 兑换码路由已移除对废弃代码的依赖

3. **✅ 清理废弃代码**
   - 废弃文件已移动到 `backend-legacy/archived/` 目录
   - 创建归档说明文档

### ✅ 中优先级任务（部分完成）

4. **✅ 更新环境变量文档**
   - `ENV_VARIABLES.md` 已完全更新
   - 移除所有废弃变量说明
   - 添加 Supabase 配置说明

5. **⏳ 完善项目管理功能**
   - 待完成：需要确认 Supabase `projects` 表结构
   - 待完成：实现项目的 CRUD 操作

### ✅ 低优先级任务（已确认）

6. **✅ 构建配置优化**
   - 确认 `tsconfig.json` 已排除 `backend-legacy` 目录
   - 无需额外配置

---

## 注意事项

1. **渐进式改进**：采用渐进式改进策略，避免大规模重构
2. **向后兼容**：确保更改不影响现有功能
3. **充分测试**：每个更改后都要充分测试
4. **文档同步**：代码更改时同步更新文档

---

**计划状态**: 基本完成（项目管理功能待完善）

**下一步**：
- 确认 Supabase `projects` 表结构
- 实现项目管理功能的 Supabase 迁移
