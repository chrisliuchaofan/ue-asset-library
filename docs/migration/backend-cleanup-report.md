# 旧后端清理报告

## 1. 全局搜索结果

### 1.1 代码文件中的旧后端引用

#### lib/backend-api-client.ts
- **状态**: 整个文件需要删除或重构
- **用途**: 后端 API 客户端，包含 token 获取和 API 调用
- **影响**: 44 个文件引用了此模块

#### lib/auth-config.ts
- **行号**: 74-201
- **问题**: 调用 `${backendUrl}/auth/login` 进行认证
- **需要**: 改为本地认证（使用 ADMIN_USERS）

#### app/api/ 目录下的文件（使用 callBackendAPI）:
1. `app/api/users/list/route.ts` - 行 3, 32
2. `app/api/projects/route.ts` - 行 3, 23, 94
3. `app/api/projects/[id]/route.ts` - 行 3, 24, 50, 79
4. `app/api/credits/admin/redeem-codes/statistics/route.ts` - 行 3, 28
5. `app/api/ai/generate-job/route.ts` - 行 7, 125, 200, 281
6. `app/api/credits/redeem/route.ts` - 行 3, 31, 73
7. `app/api/credits/admin/redeem-codes/[code]/disable/route.ts` - 行 3, 39
8. `app/api/credits/admin/redeem-codes/route.ts` - 行 3, 41, 93
9. `app/api/ai/generate-image/route.ts` - 行 7, 100, 193, 288
10. `app/api/projects/migrate/route.ts` - 行 3, 34
11. `app/api/credits/admin/recharge/route.ts` - 行 3, 47
12. `app/api/users/update-mode/route.ts` - 行 3, 53
13. `app/api/credits/transactions/route.ts` - 行 3, 35
14. `app/api/credits/add/route.ts` - 行 3, 43
15. `app/api/ai/generate-text/route.ts` - 行 6, 103
16. `app/api/ai/analyze-image/route.ts` - 行 5, 589
17. `app/api/me/route.ts` - 行 3, 35, 36

#### scripts/ 目录:
- `scripts/check-login.ts` - 行 27, 84, 88

### 1.2 文档文件中的旧后端引用

以下文档文件包含旧后端相关内容（可保留作为历史记录，但需要更新）:
- `环境变量配置模板.env.example` - 行 19-20
- `登录功能失效-深度诊断报告.md` - 多处
- `登录路径和用户数据存储说明.md` - 多处
- `服务器端口占用检查.md` - 行 161, 180-181
- `启动后端服务.sh` - 整个文件
- `本地开发环境配置说明.md` - 多处
- `服务器创建用户-无需脚本.md` - 多处
- `服务器后端连接配置.md` - 多处
- `快速访问指南.md` - 行 68, 120, 133
- `服务器诊断和启动指南.md` - 多处
- `测试账号配置.md` - 行 38, 60
- `创建测试用户指南.md` - 多处
- `端口配置说明.md` - 多处
- `服务器强制停止端口3001.sh` - 行 48
- `服务器启动后端服务.sh` - 行 10
- `服务器部署指南.md` - 多处
- `诊断后端连接.sh` - 多处
- `docker-compose.yml.example` - 行 26, 56
- `nginx.conf.example` - 行 51, 77

### 1.3 Dream Factory 状态

✅ **已确认**: `app/dream-factory/page.tsx` 已使用 `/api/generate`:
- 行 122: `fetch('/api/generate', ...)`
- 行 203: `fetch('/api/generate', ...)`
- 行 285: `fetch('/api/generate', ...)`
- 行 379: `fetch('/api/generate', ...)`
- 行 442: `fetch('/api/generate', ...)`

**无需修改** Dream Factory 代码。

## 2. 清理计划

### 阶段 1: 认证系统迁移
- [ ] 修改 `lib/auth-config.ts`，移除后端登录调用，改为本地认证

### 阶段 2: API Routes 迁移
- [ ] 替换所有 `callBackendAPI` 调用为 Supabase 查询或 Next.js API

### 阶段 3: 文档和脚本清理
- [ ] 更新环境变量配置文档
- [ ] 更新脚本中的后端启动提示

### 阶段 4: 删除废弃文件
- [ ] 删除或标记 `lib/backend-api-client.ts` 为废弃




