# M3 验证指南 - 验证数据库和后端服务运行状态

**完成时间：** 2024-12-19  
**里程碑：** M3 - 验证数据库和后端服务运行状态（地基）

---

## 📋 验证目标

确认以下系统组件真实可用：
1. ✅ 数据库连接正常
2. ✅ 后端服务运行正常
3. ✅ 健康检查接口返回正常
4. ✅ 登录接口返回正常
5. ✅ 环境变量配置正确

---

## 🚀 快速验证（推荐）

### 使用自动化验证脚本

```bash
# 在前端项目根目录执行
npm run verify:m3
```

脚本会自动检查：
- 前端环境变量配置
- 后端 API URL 配置
- 后端健康检查接口
- 后端登录接口
- 后端 /me 接口（如果可用）
- 后端 /credits/balance 接口

---

## 📝 手动验证步骤

### 1. 验证前端环境变量配置

**检查文件：** `.env.local`

**必需的环境变量：**
- `ADMIN_USERS` - 前端用户列表（格式：`email:password,email2:password2`）
- `NEXTAUTH_SECRET` - NextAuth.js 密钥

**可选的环境变量：**
- `BACKEND_API_URL` 或 `NEXT_PUBLIC_BACKEND_API_URL` - 后端 API URL
- `BACKEND_TEST_EMAIL` - 后端测试邮箱
- `BACKEND_TEST_PASSWORD` - 后端测试密码

**验证方法：**
```bash
# 检查环境变量是否存在
cat .env.local | grep -E "ADMIN_USERS|NEXTAUTH_SECRET|BACKEND_API_URL"
```

---

### 2. 验证后端服务运行状态

#### 2.1 检查 PM2 进程（如果使用 PM2）

```bash
# 检查 PM2 进程列表
pm2 list

# 查看后端服务状态
pm2 show ue-assets-backend

# 查看后端服务日志
pm2 logs ue-assets-backend --lines 50
```

**预期结果：**
- 后端服务状态为 `online`
- 没有频繁重启（`restarts` 应该为 0 或很少）

#### 2.2 检查后端服务端口

```bash
# 检查端口是否被占用
lsof -i :3001

# 或使用 netstat
netstat -an | grep 3001
```

**预期结果：**
- 端口 3001 被 Node.js 进程占用

---

### 3. 验证后端健康检查接口

```bash
# 测试健康检查接口
curl http://localhost:3001/health

# 或如果后端部署在其他服务器
curl https://api.factory-buy.com/health
```

**预期结果：**
```json
{
  "status": "ok",
  "timestamp": "2024-12-19T10:00:00.000Z"
}
```

**如果失败：**
- 检查后端服务是否运行
- 检查端口是否正确
- 检查防火墙设置

---

### 4. 验证后端登录接口

```bash
# 测试登录接口（替换为实际的邮箱和密码）
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@factory-buy.com","password":"your-password"}'
```

**预期结果：**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**如果失败：**
- 检查 `USER_WHITELIST` 环境变量是否配置
- 检查邮箱和密码是否匹配
- 检查后端日志查看错误信息

---

### 5. 验证后端 /me 接口（如果可用）

```bash
# 先登录获取 token
TOKEN=$(curl -s -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@factory-buy.com","password":"your-password"}' \
  | jq -r '.token')

# 测试 /me 接口
curl http://localhost:3001/me \
  -H "Authorization: Bearer $TOKEN"
```

**预期结果：**
```json
{
  "userId": "test@factory-buy.com",
  "email": "test@factory-buy.com",
  "balance": 0,
  "billingMode": "DRY_RUN",
  "modelMode": "DRY_RUN"
}
```

**如果返回 404：**
- 这是正常的，说明后端可能未部署 `/me` 接口
- 前端会自动使用 `/credits/balance` 作为替代

---

### 6. 验证后端 /credits/balance 接口

```bash
# 使用上面获取的 token
curl http://localhost:3001/credits/balance \
  -H "Authorization: Bearer $TOKEN"
```

**预期结果：**
```json
{
  "balance": 0
}
```

**如果失败：**
- 检查 token 是否有效
- 检查后端数据库连接
- 检查用户是否存在于数据库中

---

### 7. 验证数据库连接

#### 7.1 检查后端环境变量

**检查文件：** `backend-api/.env`

**必需的环境变量：**
- `DB_HOST` - 数据库主机
- `DB_PORT` - 数据库端口（默认 5432）
- `DB_NAME` - 数据库名称
- `DB_USERNAME` - 数据库用户名
- `DB_PASSWORD` - 数据库密码

**验证方法：**
```bash
# 检查后端环境变量（不显示密码）
cd backend-api
cat .env | grep -E "DB_HOST|DB_PORT|DB_NAME|DB_USERNAME" | sed 's/DB_PASSWORD=.*/DB_PASSWORD=***已设置/'
```

#### 7.2 测试数据库连接（使用 psql）

```bash
# 使用 psql 连接数据库
psql -h $DB_HOST -p $DB_PORT -U $DB_USERNAME -d $DB_NAME

# 如果连接成功，执行以下 SQL 查询
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM credit_transactions;
```

**预期结果：**
- 能够成功连接到数据库
- 能够查询到用户表和交易表

#### 7.3 检查数据库表结构

```bash
# 连接到数据库后，检查表是否存在
\dt

# 检查 users 表结构
\d users

# 检查 credit_transactions 表结构
\d credit_transactions
```

**预期表：**
- `users` - 用户表
- `credit_transactions` - 积分交易表
- `log_entries` - 日志表
- `jobs` - 任务表

---

## 🔍 验证后端环境变量配置

### 检查后端 .env 文件

**位置：** `backend-api/.env`

**必需的环境变量：**
- `DB_HOST` - 数据库主机
- `DB_PORT` - 数据库端口
- `DB_NAME` - 数据库名称
- `DB_USERNAME` - 数据库用户名
- `DB_PASSWORD` - 数据库密码
- `JWT_SECRET` - JWT 密钥
- `USER_WHITELIST` - 用户白名单（格式：`email:password,email2:password2`）

**可选的环境变量：**
- `MODEL_ENABLED` - 是否启用模型调用（默认 true，设为 false 启用 Dry Run）
- `BILLING_ENABLED` - 是否启用计费（默认 true，设为 false 启用 Dry Run）
- `REAL_MODE_USERS` - Real 模式用户列表（格式：`email1,email2`）
- `PORT` - 后端服务端口（默认 3001）

**验证方法：**
```bash
# 使用快速检查脚本（在服务器上执行）
cd /opt/ue-assets-backend/backend-api
./快速检查后端配置.sh
```

---

## ⚠️ 常见问题排查

### 问题 1：后端健康检查失败

**可能原因：**
- 后端服务未运行
- 端口被占用
- 防火墙阻止连接

**解决方法：**
1. 检查 PM2 进程：`pm2 list`
2. 检查端口：`lsof -i :3001`
3. 重启后端服务：`pm2 restart ue-assets-backend`

### 问题 2：后端登录失败

**可能原因：**
- `USER_WHITELIST` 未配置
- 邮箱和密码不匹配
- JWT_SECRET 未配置

**解决方法：**
1. 检查 `.env` 文件中的 `USER_WHITELIST`
2. 确保格式正确：`email:password,email2:password2`
3. 重启后端服务：`pm2 restart ue-assets-backend --update-env`

### 问题 3：数据库连接失败

**可能原因：**
- 数据库配置错误
- 数据库服务未运行
- 网络连接问题

**解决方法：**
1. 检查数据库配置：`cat backend-api/.env | grep DB_`
2. 测试数据库连接：`psql -h $DB_HOST -p $DB_PORT -U $DB_USERNAME -d $DB_NAME`
3. 检查数据库服务状态：`systemctl status postgresql`（Linux）

### 问题 4：/me 接口返回 404

**说明：**
- 这是正常的，说明后端可能未部署 `/me` 接口
- 前端会自动使用 `/credits/balance` 作为替代
- 不影响系统功能

**解决方法：**
- 无需处理，前端已有 fallback 机制

---

## ✅ 验收标准

### M3 验收标准

- ✅ 数据库连接正常
- ✅ 后端服务运行正常
- ✅ 健康检查接口返回正常
- ✅ 登录接口返回正常
- ✅ 环境变量配置正确

### 验证结果示例

```
🧪 M3 系统状态验证脚本
==================================================

📋 测试 1: 检查前端环境变量配置
✅ 前端环境变量配置: 所有必需的环境变量已配置 (5 个)

📋 测试 2: 检查后端 API URL 配置
✅ 后端 API URL 配置: 后端 API URL: https://api.factory-buy.com

📋 测试 3: 测试后端健康检查接口
✅ 后端健康检查: 后端服务运行正常

📋 测试 4: 测试后端登录接口
✅ 后端登录测试: 后端登录成功

📋 测试 5: 测试后端 /me 接口
⚠️  后端 /me 接口测试: /me 接口返回 404（可能未部署，前端会使用 /credits/balance 作为替代）

📋 测试 6: 测试后端 /credits/balance 接口
✅ 后端 /credits/balance 接口测试: /credits/balance 接口可用，余额: -5

==================================================
📊 测试结果汇总
==================================================
总计: 6 个测试
通过: 4 个 ✅
失败: 0 个 ❌
警告: 2 个 ⚠️

✅ 所有关键测试通过，但有一些警告需要关注。
```

---

## 📝 验证报告模板

完成验证后，请填写以下信息：

### 验证时间
- 日期：_____________
- 验证人：_____________

### 验证结果

| 测试项 | 状态 | 备注 |
|--------|------|------|
| 前端环境变量配置 | ✅/❌ | |
| 后端 API URL 配置 | ✅/❌ | |
| 后端健康检查 | ✅/❌ | |
| 后端登录接口 | ✅/❌ | |
| 后端 /me 接口 | ✅/⚠️/❌ | |
| 后端 /credits/balance 接口 | ✅/❌ | |
| 数据库连接 | ✅/❌ | |

### 发现的问题

1. _________________________________
2. _________________________________
3. _________________________________

### 修复建议

1. _________________________________
2. _________________________________
3. _________________________________

---

**文档结束**

