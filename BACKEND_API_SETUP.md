# 后端 API 配置和部署指南

## 📋 概述

后端 API 服务部署在 ECS，提供用户积分、调用日志、计费等功能。

## 🏗️ 架构

```
┌─────────────────┐
│  Next.js (Vercel) │
│  前端应用         │
└────────┬─────────┘
         │ HTTP API
         ↓
┌─────────────────┐
│  ECS 后端 API    │
│  Node.js/NestJS  │
│  - 积分系统      │
│  - 日志记录      │
│  - 用户验证      │
└─────────────────┘
```

## 📁 文件结构

```
web/
├── backend-api/              # 后端 API 服务（ECS）
│   ├── src/
│   │   ├── main.ts          # 入口文件
│   │   ├── app.module.ts    # 根模块
│   │   ├── auth/            # 认证模块
│   │   ├── credits/         # 积分模块
│   │   ├── logs/            # 日志模块
│   │   └── health/          # 健康检查
│   ├── package.json
│   └── tsconfig.json
└── lib/
    └── backend-client.ts    # 后端 API 客户端（Next.js）
```

## 🔧 环境变量配置

### Vercel (Next.js 前端)

在 Vercel Dashboard 的环境变量中添加：

```env
# NextAuth 配置
NEXTAUTH_SECRET=your-secret-key-change-in-production
NEXTAUTH_URL=https://your-domain.vercel.app

# 后端 API 地址
BACKEND_API_URL=https://your-ecs-domain.com

# 用户白名单（可选，用于快速测试）
USER_WHITELIST=user1@example.com:password1,user2@example.com:password2

# OSS 配置（已有）
OSS_BUCKET=your-bucket
OSS_REGION=oss-cn-hangzhou
OSS_ACCESS_KEY_ID=your-key-id
OSS_ACCESS_KEY_SECRET=your-key-secret
NEXT_PUBLIC_CDN_BASE=https://your-cdn-domain.com

# AI 配置（已有）
AI_IMAGE_API_KEY=your-api-key
JIMENG_REQ_KEY=jimeng_i2v_first_v30
```

### ECS (后端 API)

在 ECS 服务器上创建 `.env` 文件：

```env
# 服务器配置
PORT=3001
NODE_ENV=production

# 前端地址（CORS）
FRONTEND_URL=https://your-domain.vercel.app

# JWT 密钥（与 NextAuth 共享或独立）
JWT_SECRET=your-jwt-secret-key
# 或者使用与 NextAuth 相同的密钥
NEXTAUTH_SECRET=your-secret-key-change-in-production

# 用户白名单（可选，用于快速测试）
USER_WHITELIST=user1@example.com:password1,user2@example.com:password2

# 初始积分（新用户默认积分）
INITIAL_CREDITS=100

# 数据库配置（如果使用数据库，可选）
# DATABASE_URL=mongodb://localhost:27017/ue-assets
# 或
# DATABASE_URL=postgresql://user:password@localhost:5432/ue-assets
```

## 🚀 部署步骤

### 步骤 1: 在 ECS 上部署后端 API

#### 1.1 上传代码到 ECS

```bash
# 在本地
cd backend-api
npm install
npm run build

# 上传到 ECS（使用 scp 或 rsync）
scp -r dist/ user@your-ecs-ip:/opt/ue-assets-backend/
scp package.json user@your-ecs-ip:/opt/ue-assets-backend/
scp .env user@your-ecs-ip:/opt/ue-assets-backend/
```

#### 1.2 在 ECS 上安装依赖

```bash
# SSH 到 ECS
ssh user@your-ecs-ip

# 进入项目目录
cd /opt/ue-assets-backend

# 安装生产依赖（只安装 dependencies，不安装 devDependencies）
npm install --production
```

#### 1.3 配置环境变量

```bash
# 在 ECS 上创建 .env 文件
nano /opt/ue-assets-backend/.env

# 填入环境变量（参考上面的配置）
```

#### 1.4 使用 PM2 运行（推荐）

```bash
# 安装 PM2
npm install -g pm2

# 启动服务
cd /opt/ue-assets-backend
pm2 start dist/main.js --name ue-assets-backend

# 设置开机自启
pm2 startup
pm2 save

# 查看状态
pm2 status
pm2 logs ue-assets-backend
```

#### 1.5 配置 Nginx 反向代理（可选）

```nginx
# /etc/nginx/sites-available/ue-assets-backend
server {
    listen 80;
    server_name api.your-domain.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# 启用配置
sudo ln -s /etc/nginx/sites-available/ue-assets-backend /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 步骤 2: 配置 Vercel 环境变量

1. 登录 [Vercel Dashboard](https://vercel.com/dashboard)
2. 选择项目
3. 进入 **Settings** → **Environment Variables**
4. 添加以下变量：

| 变量名 | 值 | 环境 |
|--------|-----|------|
| `NEXTAUTH_SECRET` | `生成的随机密钥` | Production, Preview |
| `NEXTAUTH_URL` | `https://your-domain.vercel.app` | Production, Preview |
| `BACKEND_API_URL` | `https://api.your-domain.com` 或 `http://your-ecs-ip:3001` | Production, Preview |
| `USER_WHITELIST` | `user1@example.com:pass1,user2@example.com:pass2` | Production, Preview |

5. 点击 **Save**
6. 重新部署项目

### 步骤 3: 测试连接

#### 3.1 测试后端健康检查

```bash
curl https://api.your-domain.com/health
# 或
curl http://your-ecs-ip:3001/health
```

预期响应：
```json
{
  "status": "ok",
  "timestamp": 1234567890
}
```

#### 3.2 测试前端连接后端

在浏览器控制台运行：
```javascript
fetch('/api/backend/health').then(r => r.json()).then(console.log);
```

## 🔐 安全配置

### 1. HTTPS 配置

- 使用 Nginx 配置 SSL 证书（Let's Encrypt）
- 或使用云服务商的负载均衡器配置 HTTPS

### 2. 防火墙配置

```bash
# 只开放必要端口
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
```

### 3. JWT 密钥安全

- 使用强随机密钥：`openssl rand -base64 32`
- 不要将密钥提交到 Git
- 定期更换密钥

## 📊 API 接口说明

### GET /health
健康检查，无需认证

### POST /auth/login
用户登录
- 请求：`{ email, password }`
- 响应：`{ success, userId, email, name, token }`

### POST /auth/verify
验证 Token
- 请求：`{ token }`
- 响应：`{ valid, userId, email }`

### GET /credits/balance
获取积分余额
- Headers: `Authorization: Bearer {token}`, `X-User-Id: {userId}`
- 响应：`{ balance }`

### POST /credits/consume
消费积分
- Headers: `Authorization: Bearer {token}`, `X-User-Id: {userId}`
- 请求：`{ amount, action }`
- 响应：`{ success, balance, transactionId }`
- 错误（402）：`{ message, code, balance, required }`

### POST /logs/create
创建日志
- Headers: `Authorization: Bearer {token}`, `X-User-Id: {userId}`
- 请求：`{ action, details, success, timestamp }`
- 响应：`{ logId }`

## 🐛 故障排查

### 问题 1: 前端无法连接后端

**检查：**
1. 后端服务是否运行：`pm2 status`
2. 端口是否开放：`netstat -tlnp | grep 3001`
3. 防火墙配置：`sudo ufw status`
4. CORS 配置是否正确

### 问题 2: 积分扣除失败

**检查：**
1. 后端日志：`pm2 logs ue-assets-backend`
2. 用户ID是否正确传递
3. Token 是否有效

### 问题 3: 登录失败

**检查：**
1. 环境变量 `USER_WHITELIST` 配置是否正确
2. 后端日志查看错误信息
3. JWT_SECRET 是否与 NextAuth 一致

## 📝 后续扩展

### 数据库集成

如果需要持久化存储，可以：

1. **安装数据库驱动**
   ```bash
   npm install @nestjs/typeorm typeorm pg  # PostgreSQL
   # 或
   npm install @nestjs/mongoose mongoose  # MongoDB
   ```

2. **创建实体**
   ```typescript
   // User 实体
   // Credits 实体
   // Log 实体
   ```

3. **修改 Service**
   - 将内存存储改为数据库操作
   - 添加数据迁移脚本

### 用户注册功能

1. 添加 `/auth/register` 接口
2. 密码加密存储（bcrypt）
3. 邮箱验证（可选）

### 积分充值功能

1. 添加 `/credits/recharge` 接口（需要管理员权限）
2. 集成支付系统（支付宝/微信）
3. 添加充值记录

## 📚 相关文档

- [NestJS 官方文档](https://docs.nestjs.com/)
- [PM2 使用指南](https://pm2.keymetrics.io/docs/usage/quick-start/)
- [Nginx 配置指南](https://nginx.org/en/docs/)








