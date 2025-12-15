# 🔍 项目体检报告 - 现实状态冻结

**生成时间：** 2024-12-19  
**审计角色：** 资深技术负责人 + 系统架构审计员 + 项目经理  
**审计范围：** 全栈系统（前端 Next.js + 后端 NestJS + 数据库 PostgreSQL）

---

## 📋 执行摘要

### 系统当前状态分类

👉 **当前系统是【多用户未完成 / 部分可用】**

**核心结论：**
- ✅ 前端认证系统已实现（NextAuth.js）
- ✅ 后端用户系统已实现（数据库 + 积分系统）
- ⚠️ **前后端用户身份链路存在断裂风险**
- ❌ **前端 AI 调用未完全接入后端计费系统**
- ⚠️ **Dry Run 模式存在"伪安全"路径**

---

## 1️⃣ 实际运行状态确认

### 前端访问方式

**当前状态：**
- ✅ **本地开发：** `npm run dev` → `http://localhost:3000`
- ✅ **生产环境：** 部署在 Vercel（根据 `next.config.ts` 配置推断）
- ✅ **配置完整：** Next.js 16 + standalone 输出模式

**关键发现：**
- 前端配置了 `output: 'standalone'`，说明可能部署在自托管环境
- 图片优化配置了 OSS 域名白名单（`*.oss-*.aliyuncs.com`）
- 前端有完整的路由保护（`middleware.ts` 保护 `/admin` 和 `/dream-factory`）

### 后端运行状态

**代码显示：**
- ✅ **端口：** 默认 `3001`（`backend-api/src/main.ts:69`）
- ✅ **框架：** NestJS + TypeORM + PostgreSQL
- ✅ **进程管理：** 配置了 PM2（`ecosystem.config.js` 存在）
- ⚠️ **运行状态：** **无法确认是否实际运行**

**关键发现：**
- 后端有健康检查接口 `/health`
- 后端配置了 CORS，允许 `http://localhost:3000` 和 `https://www.factory-buy.com`
- 后端 URL 配置：`NEXT_PUBLIC_BACKEND_API_URL` 或 `BACKEND_API_URL`，默认 `https://api.factory-buy.com`

**⚠️ 风险点：**
- 前端代码中有多处 fallback 逻辑（后端不可用时返回默认值）
- 说明**后端可能未稳定运行**或**网络连接不稳定**

### 数据库连接状态

**配置检查：**
- ✅ **数据库类型：** PostgreSQL
- ✅ **连接配置：** 通过环境变量（`DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USERNAME`, `DB_PASSWORD`）
- ⚠️ **连接状态：** **无法确认是否真实连接**

**关键发现：**
- `DatabaseModule` 有配置验证逻辑（`backend-api/src/database/database.module.ts:28-38`）
- 如果配置不完整，会在启动时输出错误日志
- **但无法确认数据库是否真实可访问**

**⚠️ 风险点：**
- 如果数据库未连接，后端服务可能无法启动
- 或者后端服务启动但数据库操作会失败

### 真实 API 调用（费用风险）

**AI 图像分析 API（`/api/ai/analyze-image`）：**
- ✅ **有 Dry Run 保护：** 如果 `AI_IMAGE_API_ENDPOINT` 或 `AI_IMAGE_API_KEY` 未配置，返回 mock 结果
- ⚠️ **但：** 如果环境变量已配置，**会直接调用真实 API**（`app/api/ai/analyze-image/route.ts:353-361`）
- ❌ **未发现：** 前端 AI 图像分析调用后端计费接口

**AI 文本生成 API（`/api/ai/generate-text`）：**
- ⚠️ **需要检查：** 是否调用了后端 API 并扣费
- ⚠️ **需要检查：** 是否在 Dry Run 模式下仍然调用真实模型

**后端模型调用（`backend-api/src/ai/model-adapter.service.ts`）：**
- ✅ **有 Dry Run 保护：** `MODEL_ENABLED=false` 时返回 mock 数据
- ✅ **有 Dry Run 保护：** `BILLING_ENABLED=false` 时返回模拟扣费结果
- ⚠️ **但：** 如果 `MODEL_ENABLED=true` 且环境变量已配置，**会调用真实模型 API**

**✅ 已修复（2024-12-19 更新）：**
- **前端 AI 图像生成（`/api/ai/generate-image`）已接入后端计费系统**（`app/api/ai/generate-image/route.ts:100-112`）
- **前端 AI 文本生成（`/api/ai/generate-text`）已接入后端计费系统**
- **前端 AI 视频生成（`/api/ai/generate-job`）已接入后端计费系统**（`app/api/ai/generate-job/route.ts:125-137`）
- **所有 AI 调用都先检查 Dry Run 模式，再调用后端计费接口**

**⚠️ 仍需完善：**
- **生成产物上传到 OSS**：后端 `StorageService` 已实现，但前端生成路径可能未完全接入后端上传流程

---

## 2️⃣ 用户维度完整性检查（重点）

### 系统是否真的知道"是谁在操作"

**前端认证（NextAuth.js）：**
- ✅ **有用户身份：** `session.user.id`, `session.user.email`, `session.user.name`
- ✅ **有登录保护：** `middleware.ts` 保护 `/admin` 和 `/dream-factory`
- ✅ **有登录 UI：** `/auth/login` 页面

**后端认证（NestJS + JWT）：**
- ✅ **有用户身份：** `userId` 和 `email`（从 JWT token 解析）
- ✅ **有用户数据库：** `User` 实体（`backend-api/src/database/entities/user.entity.ts`）
- ✅ **有积分系统：** `CreditsService` 基于 `userId` 管理积分

**✅ 已修复（2024-12-19 更新）：前后端用户身份链路**

**前端 → 后端身份传递：**
1. 前端通过 `getBackendToken()` 获取后端 token（`lib/backend-api-client.ts:22-140`）
2. **前端已实现调用后端登录接口**（`lib/auth-config.ts:44-71`）
   - 使用 `session.user.email` 和密码调用后端 `/auth/login`
   - 如果后端不可用，回退到本地认证（开发环境）
3. **问题：** 生产环境应禁用本地认证 fallback

**后端 → 前端身份传递：**
1. 前端调用 `/api/me` 获取用户信息（`app/api/me/route.ts`）
2. `/api/me` 调用 `getCurrentUserInfo()`（`lib/backend-api-client.ts:179-187`）
3. `getCurrentUserInfo()` 调用后端 `/me` 接口
4. **问题：** 如果后端不可用，返回默认值（`balance: 0`, `billingMode: 'DRY_RUN'`）

**结论：**
- ✅ **前端知道用户是谁**（NextAuth session）
- ✅ **后端知道用户是谁**（JWT token + 数据库）
- ✅ **前后端用户身份链路已修复**（前端已调用后端登录接口）
- ⚠️ **生产环境应禁用本地认证 fallback**

### userId 的单一可信来源

**前端 userId 来源：**
- `session.user.id`（NextAuth JWT token 中的 `id`）
- 生成逻辑：`lib/auth-config.ts:103-109`，从 `user.id` 设置到 token

**后端 userId 来源：**
- JWT token 解析（`@CurrentUser()` 装饰器）
- 数据库 `User` 表的 `id` 字段（通常是 email）

**⚠️ 问题：**
- **前端 `session.user.id` 可能与后端 `userId` 不一致**
- 前端使用 NextAuth 生成的 `id`，后端使用 email 作为 `userId`
- **没有明确的单一可信来源**

### UI 是否能区分不同用户

**检查结果：**
- ✅ **登录页面：** 支持多用户登录（`ADMIN_USERS` 环境变量支持多个用户）
- ✅ **用户信息显示：** `/dream-factory` 页面显示用户信息（`app/dream-factory/page.tsx:34-40`）
- ⚠️ **但：** 没有用户列表、没有用户切换、没有用户管理 UI

**结论：**
- ✅ **系统支持多用户**（代码层面）
- ⚠️ **UI 层面未完全体现多用户特性**（没有用户管理界面）

### 积分 / dry-run / 计费逻辑是否依赖用户身份

**积分系统：**
- ✅ **依赖用户身份：** `CreditsService.consume()` 需要 `userId`（`backend-api/src/credits/credits.service.ts:109-114`）
- ✅ **账本化设计：** 从 `CreditTransaction` 表 sum 计算余额（真实来源）
- ✅ **幂等性支持：** 通过 `refId` 防止重复扣费

**Dry Run 模式：**
- ✅ **依赖环境变量：** `MODEL_ENABLED` 和 `BILLING_ENABLED`
- ⚠️ **但：** 可以按用户配置（`REAL_MODE_USERS` 环境变量，`backend-api/src/auth/auth.controller.ts:69-78`）

**计费逻辑：**
- ✅ **依赖用户身份：** 所有扣费操作都需要 `userId`
- ⚠️ **但：** 前端 AI 调用可能未完全接入后端计费系统

**结论：**
- ✅ **后端计费逻辑完全依赖用户身份**
- ⚠️ **前端 AI 调用可能绕过后端计费系统**

---

## 3️⃣ Dry Run 真实性审计

### Dry Run 是否只是 flag？

**后端 Dry Run 实现：**

1. **模型调用 Dry Run（`backend-api/src/ai/model-adapter.service.ts:47-52`）：**
   - ✅ **真实 Dry Run：** `MODEL_ENABLED=false` 时，**不调用真实 API**，返回 mock 数据
   - ✅ **安全：** 代码层面阻止了真实 API 调用

2. **计费 Dry Run（`backend-api/src/credits/credits.service.ts:116-129`）：**
   - ✅ **真实 Dry Run：** `BILLING_ENABLED=false` 时，**不写数据库**，返回模拟结果
   - ✅ **安全：** 代码层面阻止了真实扣费

**前端 Dry Run 实现：**

1. **AI 图像分析（`app/api/ai/analyze-image/route.ts:197-217`）：**
   - ✅ **有保护：** 如果 `AI_IMAGE_API_ENDPOINT` 或 `AI_IMAGE_API_KEY` 未配置，返回 mock 结果
   - ⚠️ **但：** 如果环境变量已配置，**会直接调用真实 API**（没有 Dry Run flag 检查）

2. **AI 文本生成（`/api/ai/generate-text`）：**
   - ⚠️ **需要检查：** 是否调用了后端 API（应该走后端 Dry Run）
   - ⚠️ **需要检查：** 是否直接调用了 AI API（绕过后端）

**结论：**
- ✅ **后端 Dry Run 是真实的**（代码层面阻止真实调用）
- ⚠️ **前端 AI 图像分析没有 Dry Run flag**（依赖环境变量配置）

### 是否仍然调用真实模型 API？

**危险路径（❌ 会花钱）：**

1. **前端 AI 图像分析（`/api/ai/analyze-image`）：**
   - 如果 `AI_IMAGE_API_ENDPOINT` 和 `AI_IMAGE_API_KEY` 已配置
   - **会直接调用真实 AI API**（`app/api/ai/analyze-image/route.ts:353-361`）
   - **不会检查 Dry Run 模式**
   - **不会调用后端计费系统**

2. **后端模型调用（如果 `MODEL_ENABLED=true`）：**
   - 如果 `MODEL_ENABLED=true` 且 API Key 已配置
   - **会调用真实模型 API**（`backend-api/src/ai/model-adapter.service.ts:94-158`）

**安全路径（✅ 不会花钱）：**

1. **后端模型调用（如果 `MODEL_ENABLED=false`）：**
   - 返回 mock 数据，不调用真实 API

2. **后端计费（如果 `BILLING_ENABLED=false`）：**
   - 返回模拟结果，不写数据库

3. **前端 AI 图像分析（如果环境变量未配置）：**
   - 返回 mock 结果

**伪安全路径（⚠️ 看起来安全但可能不安全）：**

1. **前端 AI 图像分析（环境变量已配置但未调用后端）：**
   - 会调用真实 AI API
   - 但不会扣费（因为没有调用后端计费系统）
   - **问题：** 直接产生费用，但用户不知道

2. **后端模型调用（`MODEL_ENABLED=false` 但 `BILLING_ENABLED=true`）：**
   - 不会调用真实模型
   - 但会尝试扣费（虽然不会成功，因为模型调用失败）
   - **问题：** 逻辑不一致

### 是否存在"开发者以为没花钱，实际上在烧钱"的路径？

**❌ 危险路径 1：前端 AI 图像分析直接调用真实 API**

**路径：**
1. 前端调用 `/api/ai/analyze-image`
2. 环境变量 `AI_IMAGE_API_ENDPOINT` 和 `AI_IMAGE_API_KEY` 已配置
3. **直接调用真实 AI API**（`app/api/ai/analyze-image/route.ts:353-361`）
4. **不检查 Dry Run 模式**
5. **不调用后端计费系统**

**风险：**
- ✅ **会产生真实费用**（AI API 调用费用）
- ❌ **但不会扣用户积分**（因为没有调用后端计费系统）
- ⚠️ **开发者可能以为"没配置后端就不会花钱"，但实际上前端直接调用了 AI API**

**❌ 危险路径 2：后端模型调用但未启用 Dry Run**

**路径：**
1. 后端 `MODEL_ENABLED=true`（或未设置，默认为 true）
2. 后端 `BILLING_ENABLED=true`（或未设置，默认为 true）
3. API Key 已配置
4. **会调用真实模型 API**
5. **会真实扣费**

**风险：**
- ✅ **会产生真实费用**
- ✅ **会扣用户积分**
- ⚠️ **如果开发者以为"默认是 Dry Run"，但实际上默认是 REAL 模式**

**⚠️ 伪安全路径：前端 AI 图像分析环境变量未配置但后端已配置**

**路径：**
1. 前端 `AI_IMAGE_API_ENDPOINT` 未配置
2. 前端返回 mock 结果
3. **但后端可能已配置了 AI API**
4. **如果前端直接调用后端 AI API，仍然会产生费用**

**风险：**
- ⚠️ **前端看起来安全（返回 mock），但后端可能不安全**

---

## 4️⃣ 状态与流程可观测性

### 出错时，用户是否知道错在哪？

**前端错误处理：**

1. **AI 图像分析错误（`components/media-gallery.tsx:402-410`）：**
   - ✅ **有错误提示：** `setAiError(errorMessage)`
   - ✅ **有错误显示：** UI 中显示错误信息
   - ⚠️ **但：** 错误信息可能不够详细（只显示 `errorData.message`）

2. **后端 API 调用错误（`lib/backend-api-client.ts:109-120`）：**
   - ✅ **有错误日志：** `console.warn('[BackendApiClient] 后端登录失败')`
   - ⚠️ **但：** 前端可能返回默认值，用户不知道后端不可用

**后端错误处理：**

1. **积分不足错误（`backend-api/src/credits/credits.service.ts:169-179`）：**
   - ✅ **有明确错误：** `INSUFFICIENT_CREDITS` 错误码
   - ✅ **有余额信息：** 返回当前余额和所需金额

2. **数据库错误：**
   - ⚠️ **可能没有明确的错误提示**（TypeORM 错误可能不够友好）

**结论：**
- ✅ **基本错误处理已实现**
- ⚠️ **错误信息可能不够详细**（特别是网络错误、数据库错误）

### 控制台错误 vs UI 错误是否割裂？

**检查结果：**
- ✅ **前端有控制台日志：** `console.log`, `console.warn`, `console.error`
- ✅ **前端有 UI 错误显示：** `setAiError`, `setError`
- ⚠️ **但：** 控制台错误和 UI 错误可能不一致（控制台有详细错误，UI 只显示简单消息）

**结论：**
- ⚠️ **控制台错误和 UI 错误存在割裂**（用户看不到控制台错误）

### 是否能快速判断错误类型？

**错误类型识别：**

1. **登录问题：**
   - ✅ **有明确错误：** `401 Unauthorized`
   - ✅ **有错误提示：** "未登录，请先登录"

2. **权限问题：**
   - ⚠️ **可能没有明确的权限错误**（只有 401 错误）

3. **余额问题：**
   - ✅ **有明确错误：** `INSUFFICIENT_CREDITS` 错误码
   - ✅ **有余额信息：** 返回当前余额

4. **模型问题：**
   - ⚠️ **可能没有明确的模型错误**（只有通用错误消息）

**结论：**
- ✅ **部分错误类型可以快速识别**（登录、余额）
- ⚠️ **部分错误类型可能不够明确**（权限、模型）

---

## 5️⃣ 当前真实可用功能

### ✅ 已实现且可用的功能

1. **前端认证系统：**
   - ✅ 多用户登录（NextAuth.js）
   - ✅ 路由保护（`/admin`, `/dream-factory`）
   - ✅ 登录 UI

2. **后端用户系统：**
   - ✅ 用户数据库（PostgreSQL）
   - ✅ 积分系统（账本化设计）
   - ✅ JWT 认证

3. **前端资产库功能：**
   - ✅ 资产列表、搜索、筛选
   - ✅ 素材列表、搜索、筛选
   - ✅ 资产详情、素材详情

4. **前端 AI 功能（部分）：**
   - ✅ AI 图像分析（但可能未接入后端计费）
   - ✅ AI 文本生成（需要确认是否接入后端）

5. **后端 Dry Run 模式：**
   - ✅ 模型调用 Dry Run
   - ✅ 计费 Dry Run

### ⚠️ 已写代码但可能不可用的功能

1. **前后端用户身份链路：**
   - ⚠️ 如果前端 `session.user.email` 与后端 `USER_WHITELIST` 不匹配，后端登录会失败
   - ⚠️ 如果后端不可用，前端会返回默认值（用户不知道）

2. **前端 AI 调用后端计费：**
   - ⚠️ AI 图像分析可能未接入后端计费系统
   - ⚠️ AI 文本生成需要确认是否接入后端

3. **数据库连接：**
   - ⚠️ 无法确认数据库是否真实连接

4. **后端服务运行：**
   - ⚠️ 无法确认后端服务是否真实运行

### ⚠️ 当前最大系统性缺陷（不超过 3 条）

1. **生成产物未完全上传到 OSS**
   - **问题：** 前端生成的图片/视频可能未完全接入后端上传流程，部分路径可能直接返回 AI API 的临时 URL
   - **影响：** 生成产物可能存储在 AI 服务商的临时 URL，无法长期访问，不符合"所有生成产物统一上传到 OSS"的要求
   - **严重性：** 🔴 高

2. **管理员入口与普通用户入口未明确区分**
   - **问题：** UI 层面未明确区分管理员和普通用户入口，缺少管理员专用的用户管理、兑换码管理界面
   - **影响：** 无法满足"明确区分管理员入口与普通用户入口"的要求
   - **严重性：** 🟡 中

3. **兑换码系统未实现**
   - **问题：** 兑换码系统完全未实现，包括数据库实体、后端接口、前端 UI
   - **影响：** 无法满足"支持手动兑换码充值"的要求
   - **严重性：** 🟡 中

---

## 6️⃣ 环境变量依赖清单

### 前端必需环境变量

```env
# NextAuth 配置（必需）
NEXTAUTH_SECRET=xxx
NEXTAUTH_URL=http://localhost:3000

# 管理员账号（必需）
ADMIN_USERS=admin:admin123,user1:password1

# 后端 API 配置（可选，但推荐）
NEXT_PUBLIC_BACKEND_API_URL=https://api.factory-buy.com
BACKEND_TEST_EMAIL=test@factory-buy.com
BACKEND_TEST_PASSWORD=password123

# AI 图像分析 API（可选，如果未配置会返回 mock）
AI_IMAGE_API_ENDPOINT=https://xxx
AI_IMAGE_API_KEY=xxx
```

### 后端必需环境变量

```env
# 数据库配置（必需）
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ue_assets
DB_USERNAME=xxx
DB_PASSWORD=xxx

# JWT 配置（必需）
JWT_SECRET=xxx

# 用户白名单（必需）
USER_WHITELIST=admin@admin.local:admin123,user1@admin.local:password1

# Dry Run 模式（可选，默认安全）
MODEL_ENABLED=false          # 默认 false（Dry Run）
BILLING_ENABLED=false        # 默认 false（Dry Run）

# 初始积分（可选）
INITIAL_CREDITS=100

# 消费限制（可选）
MAX_SINGLE_CONSUME=100
DAILY_COST_LIMIT=1000

# 真实模式用户白名单（可选）
REAL_MODE_USERS=admin@admin.local

# AI 模型配置（如果 MODEL_ENABLED=true，需要配置）
MODEL_PROVIDER=qwen
QWEN_API_KEY=xxx
QWEN_MODEL=qwen-turbo
```

---

## 7️⃣ 关键代码路径追踪

### 用户登录流程

1. **前端登录：**
   - `app/auth/login/page.tsx` → NextAuth `signIn()`
   - `lib/auth-config.ts:30-122` → NextAuth 配置
   - `lib/auth-config.ts:7-28` → 从 `ADMIN_USERS` 环境变量读取用户列表

2. **后端登录（前端获取 token）：**
   - `lib/backend-api-client.ts:22-140` → `getBackendToken()`
   - 使用 `session.user.email` 和 `ADMIN_USERS` 中的密码登录后端
   - `backend-api/src/auth/auth.service.ts` → 后端登录逻辑

3. **后端用户初始化：**
   - `backend-api/src/credits/credits.service.ts:22-55` → `initializeUsers()`
   - 从 `USER_WHITELIST` 环境变量创建用户记录

### AI 调用流程

1. **前端 AI 图像分析：**
   - `components/media-gallery.tsx:337-447` → `handleAIAnalyze()`
   - `app/api/ai/analyze-image/route.ts:470-581` → `/api/ai/analyze-image`
   - `app/api/ai/analyze-image/route.ts:185-450` → `callAIImageAPI()`
   - ⚠️ **直接调用真实 AI API**（如果环境变量已配置）

2. **前端 AI 文本生成（需要确认）：**
   - `app/dream-factory/page.tsx:94-102` → 调用 `/api/ai/generate-text`
   - ⚠️ **需要检查是否调用后端 API**

3. **后端 AI 模型调用：**
   - `backend-api/src/ai/ai.controller.ts` → `/ai/generate-text`
   - `backend-api/src/ai/model-adapter.service.ts:42-66` → `generateContent()`
   - ✅ **有 Dry Run 保护**（`MODEL_ENABLED=false` 时返回 mock）

### 积分扣费流程

1. **后端积分扣费：**
   - `backend-api/src/credits/credits.controller.ts` → `/credits/consume`
   - `backend-api/src/credits/credits.service.ts:109-266` → `consume()`
   - ✅ **有 Dry Run 保护**（`BILLING_ENABLED=false` 时返回模拟结果）

2. **前端积分查询：**
   - `app/api/me/route.ts` → `/api/me`
   - `lib/backend-api-client.ts:179-187` → `getCurrentUserInfo()`
   - `backend-api/src/auth/auth.controller.ts:56-87` → `/me`

---

## 8️⃣ 风险评估矩阵

| 风险项 | 严重性 | 可能性 | 影响 | 优先级 |
|--------|--------|--------|------|--------|
| 前后端用户身份链路断裂 | 🔴 高 | 🟡 中 | 用户无法使用后端功能 | P0 |
| 前端 AI 调用未接入后端计费 | 🔴 高 | 🟡 中 | 产生真实费用但不扣积分 | P0 |
| Dry Run 模式不一致 | 🟡 中 | 🟡 中 | 开发者误以为安全但实际不安全 | P1 |
| 数据库连接状态未知 | 🟡 中 | 🟢 低 | 后端功能不可用 | P1 |
| 后端服务运行状态未知 | 🟡 中 | 🟢 低 | 后端功能不可用 | P1 |
| 错误信息不够详细 | 🟢 低 | 🟡 中 | 用户不知道错误原因 | P2 |

---

## 9️⃣ 下一步行动建议

### 立即行动（P0）

1. **修复前后端用户身份链路：**
   - 确保前端 `session.user.email` 与后端 `USER_WHITELIST` 匹配
   - 或实现统一的用户 ID 映射机制

2. **修复前端 AI 调用未接入后端计费：**
   - 将 AI 图像分析接入后端计费系统
   - 确保所有 AI 调用都经过后端 Dry Run 检查

### 短期行动（P1）

3. **统一 Dry Run 模式：**
   - 前端 AI 调用应该调用后端 API，而不是直接调用 AI API
   - 确保所有 AI 调用都经过后端 Dry Run 检查

4. **验证数据库和后端服务运行状态：**
   - 运行 `快速检查后端配置.sh` 脚本
   - 确认数据库连接正常
   - 确认后端服务运行正常

### 长期行动（P2）

5. **改进错误处理和可观测性：**
   - 统一错误信息格式
   - 改进 UI 错误提示
   - 添加错误日志收集

---

## 🔟 附录：关键文件清单

### 前端关键文件

- `lib/auth-config.ts` - NextAuth 配置
- `lib/backend-api-client.ts` - 后端 API 客户端
- `app/api/ai/analyze-image/route.ts` - AI 图像分析 API
- `app/api/me/route.ts` - 用户信息 API
- `middleware.ts` - 路由保护

### 后端关键文件

- `backend-api/src/auth/auth.controller.ts` - 认证控制器
- `backend-api/src/credits/credits.service.ts` - 积分服务
- `backend-api/src/ai/model-adapter.service.ts` - AI 模型适配器
- `backend-api/src/database/database.module.ts` - 数据库配置

---

---

## 🔟 当前开发状态（2024-12-19 更新）

### 已完成里程碑
- ✅ **M1-M6：** 历史里程碑（已完成，冻结状态）
- ⚠️ **M7-M9：** 进行中/待完成

### 新增里程碑（M10-M12）
- 📋 **M10：生成结果分层 + OSS 归档机制**（新增）
- 📋 **M11：管理员后台（前端页面）**（新增）
- 📋 **M12：积分补充与风控最小闭环**（新增）

**详细规划：** 参见 `02_DEVELOPMENT_ROADMAP.md`

### 当前系统状态更新

**核心问题（更新）：**
1. 🔴 **生成结果未明确区分"临时展示"和"已保存"**（M10 待解决）
2. 🔴 **OSS 上传失败时可能返回临时 URL**（M10 待解决）
3. 🟡 **管理员后台缺少前端页面**（M11 待解决）
4. 🟡 **积分补充与风控机制不完整**（M12 待解决）

**已完成功能（更新）：**
- ✅ 前后端用户身份链路（M1）
- ✅ AI 调用后端计费（M2）
- ✅ 积分系统（账本化设计，不可删除、不可修改）
- ✅ OSS 存储服务（后端已实现）

**待完成功能（更新）：**
- ❌ 生成结果分层（临时/已保存）（M10）
- ❌ 管理员前端管理页面（M11）
- ❌ 积分补充与风控最小闭环（M12）

---

**报告结束**

