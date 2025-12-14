# M1：用户 ID 映射机制文档

**生成时间：** 2024-12-19  
**里程碑：** M1 - 修复前后端用户身份链路

---

## 📋 单一可信来源

**系统统一使用 `email` 作为 `userId`（单一可信来源）**

### 前端 userId 来源

**位置：** `lib/auth-config.ts:51`

```typescript
return {
  id: user.email || user.username,  // ✅ 使用 email 作为 id
  name: user.username,
  email: user.email || `${user.username}@admin.local`,
};
```

**NextAuth Session：**
- `session.user.id` = `user.email`（如果 email 存在）
- `session.user.email` = `user.email` 或 `username@admin.local`

**结论：** 前端 `session.user.id` 和 `session.user.email` 应该一致（都是 email）

### 后端 userId 来源

**位置：** `backend-api/src/auth/auth.service.ts:44`

```typescript
const token = jwt.sign(
  { userId: email, email, isAdmin: true },  // ✅ 使用 email 作为 userId
  this.jwtSecret,
  { expiresIn: '30d' }
);
```

**JWT Token 解析：**
- `decoded.userId` = `email`
- `decoded.email` = `email`

**数据库 User 实体：**
- `User.id` = `email`（`backend-api/src/database/entities/user.entity.ts:6`）

**结论：** 后端 `userId` 和 `email` 应该一致（都是 email）

---

## 🔄 用户身份传递链路

### 前端 → 后端身份传递

**步骤 1：前端登录（NextAuth）**
1. 用户在前端登录页面输入用户名和密码
2. `lib/auth-config.ts:39-58` 验证用户（从 `ADMIN_USERS` 环境变量）
3. 返回 `{ id: email, email, name }`
4. NextAuth 创建 session，`session.user.id` = `email`

**步骤 2：获取后端 token**
1. 前端调用 `getBackendToken()`（`lib/backend-api-client.ts:22-140`）
2. 从 `session.user.email` 获取 email
3. 从 `ADMIN_USERS` 或 `BACKEND_TEST_PASSWORD` 获取密码
4. 使用 `BACKEND_TEST_EMAIL`（如果配置）或 `session.user.email` 作为后端登录 email
5. 调用后端 `/auth/login` 接口
6. 后端返回 JWT token

**步骤 3：后端登录验证**
1. 后端 `auth.service.ts:27-74` 验证用户
2. 从 `USER_WHITELIST` 环境变量查找匹配的用户
3. 如果匹配，生成 JWT token，`userId: email`

**关键匹配点：**
- 前端 `session.user.email` 应该与后端 `USER_WHITELIST` 中的 email 匹配
- 或者使用 `BACKEND_TEST_EMAIL` 和 `BACKEND_TEST_PASSWORD` 统一配置

### 后端 → 前端身份传递

**步骤 1：前端调用 `/api/me`**
1. 前端调用 `getCurrentUserInfo()`（`lib/backend-api-client.ts:179-187`）
2. 自动携带后端 token（通过 `getBackendToken()` 获取）

**步骤 2：后端验证 token**
1. `AuthGuard`（`backend-api/src/credits/auth.guard.ts:8-29`）验证 JWT token
2. 从 token 中提取 `userId` 和 `email`
3. 设置 `request.user = { userId, email }`

**步骤 3：后端返回用户信息**
1. `auth.controller.ts:56-87` 的 `/me` 接口
2. 使用 `@CurrentUser()` 装饰器获取 `userId` 和 `email`
3. 从数据库查询用户积分
4. 返回 `{ userId, email, balance, billingMode, modelMode }`

---

## ⚠️ 常见问题

### 问题 1：前端 session email 与后端 USER_WHITELIST 不匹配

**症状：**
- 前端登录成功，但调用后端 API 时返回 401
- 控制台日志显示"后端登录失败"

**原因：**
- 前端 `ADMIN_USERS=admin:admin123` 生成 email `admin@admin.local`
- 后端 `USER_WHITELIST=admin:admin123` 期望 email `admin`（没有 @）

**解决方案：**

**方案 1：统一使用 email 格式（推荐）**
```env
# 前端
ADMIN_USERS=admin@admin.local:admin123

# 后端
USER_WHITELIST=admin@admin.local:admin123
```

**方案 2：使用 BACKEND_TEST_EMAIL 和 BACKEND_TEST_PASSWORD**
```env
# 前端
ADMIN_USERS=admin:admin123
BACKEND_TEST_EMAIL=admin@admin.local
BACKEND_TEST_PASSWORD=admin123

# 后端
USER_WHITELIST=admin@admin.local:admin123
```

### 问题 2：后端服务不可用

**症状：**
- 前端调用 `/api/me` 返回默认值（`balance: 0`, `billingMode: 'DRY_RUN'`）
- 控制台日志显示"后端不可用"

**原因：**
- 后端服务未运行
- 后端 URL 配置错误
- 网络连接问题

**解决方案：**
1. 检查后端服务是否运行（`pm2 list`）
2. 检查后端 URL 配置（`NEXT_PUBLIC_BACKEND_API_URL` 或 `BACKEND_API_URL`）
3. 检查网络连接（`curl http://localhost:3001/health`）

### 问题 3：密码不匹配

**症状：**
- 前端登录成功，但后端登录失败
- 控制台日志显示"后端登录失败: 401"

**原因：**
- 前端 `ADMIN_USERS` 中的密码与后端 `USER_WHITELIST` 中的密码不匹配

**解决方案：**
1. 确保前端 `ADMIN_USERS` 中的密码与后端 `USER_WHITELIST` 中的密码一致
2. 或使用 `BACKEND_TEST_PASSWORD` 统一配置

---

## ✅ 验证检查清单

### 前端配置检查

- [ ] `ADMIN_USERS` 环境变量已配置
- [ ] `NEXTAUTH_SECRET` 环境变量已配置
- [ ] `NEXT_PUBLIC_BACKEND_API_URL` 或 `BACKEND_API_URL` 环境变量已配置
- [ ] `BACKEND_TEST_EMAIL` 和 `BACKEND_TEST_PASSWORD` 已配置（可选，但推荐）

### 后端配置检查

- [ ] `USER_WHITELIST` 环境变量已配置
- [ ] `JWT_SECRET` 环境变量已配置
- [ ] 数据库连接配置正确（`DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USERNAME`, `DB_PASSWORD`）

### 匹配检查

- [ ] 前端 `ADMIN_USERS` 中的 email 与后端 `USER_WHITELIST` 中的 email 匹配
- [ ] 前端 `ADMIN_USERS` 中的密码与后端 `USER_WHITELIST` 中的密码匹配
- [ ] 或使用 `BACKEND_TEST_EMAIL` 和 `BACKEND_TEST_PASSWORD` 统一配置

---

## 📝 环境变量配置示例

### 方案 1：使用 email 格式（推荐）

**前端 `.env.local`：**
```env
ADMIN_USERS=admin@admin.local:admin123,test@admin.local:test123
NEXT_PUBLIC_BACKEND_API_URL=http://localhost:3001
```

**后端 `.env`：**
```env
USER_WHITELIST=admin@admin.local:admin123,test@admin.local:test123
JWT_SECRET=your-secret-key
```

### 方案 2：使用 BACKEND_TEST_EMAIL 和 BACKEND_TEST_PASSWORD

**前端 `.env.local`：**
```env
ADMIN_USERS=admin:admin123,test:test123
BACKEND_TEST_EMAIL=admin@admin.local
BACKEND_TEST_PASSWORD=admin123
NEXT_PUBLIC_BACKEND_API_URL=http://localhost:3001
```

**后端 `.env`：**
```env
USER_WHITELIST=admin@admin.local:admin123,test@admin.local:test123
JWT_SECRET=your-secret-key
```

---

## 🔍 调试技巧

### 1. 检查前端 session

在浏览器控制台执行：
```javascript
// 检查 session
fetch('/api/auth/session').then(r => r.json()).then(console.log)
```

应该看到：
```json
{
  "user": {
    "id": "admin@admin.local",
    "email": "admin@admin.local",
    "name": "admin"
  }
}
```

### 2. 检查后端 token

在浏览器控制台执行：
```javascript
// 检查后端 token（需要先登录）
fetch('/api/me').then(r => r.json()).then(console.log)
```

如果成功，应该看到：
```json
{
  "userId": "admin@admin.local",
  "email": "admin@admin.local",
  "balance": 100,
  "billingMode": "DRY_RUN",
  "modelMode": "DRY_RUN"
}
```

### 3. 检查后端日志

在后端服务器执行：
```bash
pm2 logs ue-assets-backend --lines 50
```

查看是否有登录相关的错误日志。

---

**文档结束**

