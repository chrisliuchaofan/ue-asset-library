# M1 测试指南 - 用户身份链路测试

**更新时间：** 2024-12-19

---

## 🚀 快速开始

### 方法 1：使用 npm script（推荐）

```bash
cd /Users/chrisl/Documents/恒星UE资产库/web
npm run test:user-identity
```

### 方法 2：使用 npx

```bash
cd /Users/chrisl/Documents/恒星UE资产库/web
npx tsx scripts/test-user-identity-chain.ts
```

### 方法 3：如果 node_modules 不存在

```bash
cd /Users/chrisl/Documents/恒星UE资产库/web
npm install  # 安装依赖
npm run test:user-identity
```

---

## 📋 环境变量要求

测试脚本需要以下环境变量（在 `.env.local` 文件中配置）：

### 必需环境变量

```env
# 前端用户列表（格式：username:password 或 email:password）
ADMIN_USERS=admin:admin123,test:test123

# 后端 API URL
NEXT_PUBLIC_BACKEND_API_URL=http://localhost:3001
# 或
BACKEND_API_URL=http://localhost:3001
```

### 可选环境变量

```env
# 后端测试 email（如果配置，会使用这个 email 作为后端登录的 email）
BACKEND_TEST_EMAIL=admin@admin.local

# 后端测试密码（如果配置，会使用这个密码作为后端登录的密码）
BACKEND_TEST_PASSWORD=admin123
```

---

## ✅ 预期输出

如果所有测试通过，应该看到：

```
🧪 M1 用户身份链路测试脚本
==================================================
📋 测试 1: 检查环境变量配置
✅ 环境变量 ADMIN_USERS: 已配置: 2 个用户
✅ 后端 API URL: 已配置: http://localhost:3001
✅ BACKEND_TEST_EMAIL 和 BACKEND_TEST_PASSWORD: 已配置统一后端测试凭据

📋 测试 2: 检查后端服务是否可用
✅ 后端健康检查: 后端服务可用

📋 测试 3: 测试后端登录
✅ 后端登录测试: 后端登录成功

📋 测试 4: 测试后端 /me 接口
✅ 后端 /me 接口测试: 后端 /me 接口调用成功

📋 测试 5: 测试多用户场景
✅ 多用户场景测试: 所有用户都能成功登录 (2/2)

==================================================
📊 测试结果汇总
==================================================
总计: 5 个测试
通过: 5 个 ✅
失败: 0 个 

✅ 所有测试通过！
```

---

## ❌ 常见问题

### 问题 1: `tsx: command not found`

**原因：** `tsx` 命令不在 PATH 中

**解决方案：**
- 使用 `npx tsx` 代替 `tsx`
- 或使用 `npm run test:user-identity`

### 问题 2: `Cannot find module 'dotenv'`

**原因：** 依赖未安装

**解决方案：**
```bash
npm install
```

### 问题 3: 后端服务不可用

**原因：** 后端服务未运行或 URL 配置错误

**解决方案：**
1. 检查后端服务是否运行：
   ```bash
   # 如果使用 PM2
   pm2 list
   
   # 或直接检查端口
   curl http://localhost:3001/health
   ```

2. 检查环境变量配置：
   ```bash
   echo $NEXT_PUBLIC_BACKEND_API_URL
   # 或
   echo $BACKEND_API_URL
   ```

### 问题 4: 后端登录失败

**原因：** 前端 `ADMIN_USERS` 与后端 `USER_WHITELIST` 不匹配

**解决方案：**
1. 检查前端 `.env.local` 中的 `ADMIN_USERS`
2. 检查后端 `.env` 中的 `USER_WHITELIST`
3. 确保 email 和密码匹配

**示例：**
```env
# 前端 .env.local
ADMIN_USERS=admin:admin123

# 后端 .env
USER_WHITELIST=admin@admin.local:admin123
```

或使用 `BACKEND_TEST_EMAIL` 和 `BACKEND_TEST_PASSWORD`：

```env
# 前端 .env.local
ADMIN_USERS=admin:admin123
BACKEND_TEST_EMAIL=admin@admin.local
BACKEND_TEST_PASSWORD=admin123

# 后端 .env
USER_WHITELIST=admin@admin.local:admin123
```

---

## 🔍 调试技巧

### 1. 检查环境变量

```bash
# 在项目根目录
cat .env.local | grep ADMIN_USERS
cat .env.local | grep BACKEND_API_URL
```

### 2. 手动测试后端登录

```bash
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@admin.local","password":"admin123"}'
```

### 3. 检查后端服务日志

```bash
# 如果使用 PM2
pm2 logs ue-assets-backend --lines 50
```

---

## 📝 测试脚本说明

测试脚本包含以下测试：

1. **测试 1: 检查环境变量配置**
   - 检查 `ADMIN_USERS` 是否配置
   - 检查后端 API URL 是否配置
   - 检查 `BACKEND_TEST_EMAIL` 和 `BACKEND_TEST_PASSWORD` 是否配置

2. **测试 2: 检查后端服务是否可用**
   - 调用后端 `/health` 接口
   - 验证后端服务是否运行

3. **测试 3: 测试后端登录**
   - 使用第一个用户尝试登录后端
   - 验证是否能获取 JWT token

4. **测试 4: 测试后端 /me 接口**
   - 使用获取的 token 调用 `/me` 接口
   - 验证是否能正确返回用户信息

5. **测试 5: 测试多用户场景**
   - 测试多个用户是否能成功登录
   - 验证多用户场景是否正常

---

**文档结束**

