# 后端 API 服务

ECS 后端 API 服务，提供用户积分、调用日志、计费等功能。

## 技术栈

- Node.js + NestJS（推荐）或 Express
- 数据库：MongoDB / PostgreSQL / MySQL（可选，用于存储用户数据）

## 项目结构

```
backend-api/
├── src/
│   ├── main.ts                 # 入口文件
│   ├── app.module.ts           # 根模块
│   ├── auth/                   # 认证模块
│   │   ├── auth.controller.ts  # /auth/verify, /auth/login
│   │   ├── auth.service.ts
│   │   └── auth.module.ts
│   ├── credits/                 # 积分模块
│   │   ├── credits.controller.ts # /credits/balance, /credits/consume
│   │   ├── credits.service.ts
│   │   └── credits.module.ts
│   ├── logs/                   # 日志模块
│   │   ├── logs.controller.ts  # /logs/create
│   │   ├── logs.service.ts
│   │   └── logs.module.ts
│   └── health/                  # 健康检查
│       └── health.controller.ts # /health
├── package.json
└── .env
```

## API 接口

### 1. GET /health
健康检查

**响应：**
```json
{
  "status": "ok",
  "timestamp": 1234567890
}
```

### 2. POST /auth/login
用户登录

**请求：**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**响应：**
```json
{
  "success": true,
  "userId": "user@example.com",
  "email": "user@example.com",
  "name": "user",
  "token": "jwt-token-here"
}
```

### 3. POST /auth/verify
验证 Token

**请求：**
```json
{
  "token": "jwt-token-here"
}
```

**响应：**
```json
{
  "valid": true,
  "userId": "user@example.com",
  "email": "user@example.com"
}
```

### 4. GET /credits/balance
获取积分余额

**Headers:**
- `Authorization: Bearer {token}`
- `X-User-Id: {userId}`

**响应：**
```json
{
  "balance": 100
}
```

### 5. POST /credits/consume
消费积分

**Headers:**
- `Authorization: Bearer {token}`
- `X-User-Id: {userId}`

**请求：**
```json
{
  "amount": 5,
  "action": "jimeng_video_generation"
}
```

**响应：**
```json
{
  "success": true,
  "balance": 95,
  "transactionId": "txn-123456"
}
```

**错误响应（积分不足）：**
```json
{
  "message": "积分不足",
  "code": "INSUFFICIENT_CREDITS",
  "balance": 2,
  "required": 5
}
```

### 6. POST /logs/create
创建日志

**Headers:**
- `Authorization: Bearer {token}`
- `X-User-Id: {userId}`

**请求：**
```json
{
  "userId": "user@example.com",
  "action": "jimeng_video_generation",
  "details": {
    "prompt": "...",
    "resolution": "1080p",
    "creditCost": 5
  },
  "success": true,
  "timestamp": "2025-01-01T00:00:00.000Z"
}
```

**响应：**
```json
{
  "logId": "log-123456"
}
```

## 环境变量

```env
# 服务器配置
PORT=3001
NODE_ENV=production

# 前端地址（CORS）
FRONTEND_URL=https://your-domain.vercel.app

# JWT 密钥（与 NextAuth 共享或独立）
JWT_SECRET=your-jwt-secret-key

# 数据库配置（如果使用数据库）
DATABASE_URL=mongodb://localhost:27017/ue-assets
# 或
DATABASE_URL=postgresql://user:password@localhost:5432/ue-assets

# 用户白名单（可选，用于快速测试）
USER_WHITELIST=user1@example.com:password1,user2@example.com:password2
```

## 快速开始（NestJS）

```bash
# 安装依赖
npm install @nestjs/core @nestjs/common @nestjs/platform-express
npm install @nestjs/jwt @nestjs/passport passport passport-jwt
npm install bcrypt
npm install class-validator class-transformer

# 启动开发服务器
npm run start:dev

# 构建生产版本
npm run build
npm run start:prod
```

## 快速开始（Express）

```bash
# 安装依赖
npm install express cors dotenv
npm install jsonwebtoken bcrypt
npm install express-validator

# 启动服务器
node src/index.js
```







