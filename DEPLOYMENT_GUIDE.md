# 完整部署指南

## 📋 架构概览

```
┌─────────────────────────────────┐
│      Vercel (Next.js 前端)       │
│  - 用户界面                      │
│  - NextAuth 认证                │
│  - 调用后端 API                  │
└──────────────┬──────────────────┘
               │ HTTPS
               ↓
┌─────────────────────────────────┐
│      ECS (后端 API)              │
│  - 用户积分管理                  │
│  - 调用日志                      │
│  - 计费系统                      │
└──────────────┬──────────────────┘
               │
               ↓
┌─────────────────────────────────┐
│      阿里云 OSS                  │
│  - 用户文件存储                  │
│  - 路径: /users/{userId}/...     │
└─────────────────────────────────┘
```

## 🚀 部署步骤

### 一、Vercel 部署（Next.js 前端）

#### 1.1 准备代码

确保代码已推送到 Git 仓库（GitHub/GitLab/Bitbucket）

#### 1.2 在 Vercel 创建项目

1. 登录 [Vercel Dashboard](https://vercel.com/dashboard)
2. 点击 **Add New** → **Project**
3. 导入 Git 仓库
4. 配置项目：
   - **Framework Preset**: Next.js
   - **Root Directory**: `web`（如果项目在子目录）
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`

#### 1.3 配置环境变量

在 Vercel Dashboard → Settings → Environment Variables 添加：

```env
# NextAuth
NEXTAUTH_SECRET=your-secret-key-here
NEXTAUTH_URL=https://your-domain.vercel.app

# 后端 API
BACKEND_API_URL=https://api.your-domain.com

# 用户白名单（可选）
USER_WHITELIST=user1@example.com:password1,user2@example.com:password2

# OSS（已有）
OSS_BUCKET=your-bucket
OSS_REGION=oss-cn-hangzhou
OSS_ACCESS_KEY_ID=your-key-id
OSS_ACCESS_KEY_SECRET=your-key-secret
NEXT_PUBLIC_CDN_BASE=https://your-cdn-domain.com

# AI（已有）
AI_IMAGE_API_KEY=your-api-key
JIMENG_REQ_KEY=jimeng_i2v_first_v30
```

#### 1.4 部署

点击 **Deploy**，等待部署完成

### 二、ECS 部署（后端 API）

#### 2.1 准备服务器

```bash
# SSH 连接到 ECS
ssh user@your-ecs-ip

# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装 Node.js（如果未安装）
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 验证安装
node --version
npm --version
```

#### 2.2 上传代码

```bash
# 在本地构建
cd backend-api
npm install
npm run build

# 上传到 ECS（使用 scp）
scp -r dist/ user@your-ecs-ip:/opt/ue-assets-backend/
scp package.json user@your-ecs-ip:/opt/ue-assets-backend/
scp tsconfig.json user@your-ecs-ip:/opt/ue-assets-backend/
```

#### 2.3 在 ECS 上安装依赖

```bash
# SSH 到 ECS
ssh user@your-ecs-ip

# 创建项目目录
sudo mkdir -p /opt/ue-assets-backend
sudo chown $USER:$USER /opt/ue-assets-backend
cd /opt/ue-assets-backend

# 安装依赖
npm install --production
```

#### 2.4 配置环境变量

```bash
# 创建 .env 文件
nano /opt/ue-assets-backend/.env
```

内容：
```env
PORT=3001
NODE_ENV=production
FRONTEND_URL=https://your-domain.vercel.app
JWT_SECRET=your-jwt-secret-key
USER_WHITELIST=user1@example.com:password1,user2@example.com:password2
INITIAL_CREDITS=100
```

#### 2.5 使用 PM2 运行

```bash
# 安装 PM2
sudo npm install -g pm2

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

#### 2.6 配置 Nginx（可选，推荐）

```bash
# 安装 Nginx
sudo apt install nginx

# 创建配置文件
sudo nano /etc/nginx/sites-available/ue-assets-backend
```

内容：
```nginx
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

#### 2.7 配置 SSL（可选，推荐）

```bash
# 安装 Certbot
sudo apt install certbot python3-certbot-nginx

# 申请证书
sudo certbot --nginx -d api.your-domain.com

# 自动续期
sudo certbot renew --dry-run
```

### 三、域名配置

#### 3.1 前端域名（Vercel）

1. 在 Vercel Dashboard → Settings → Domains
2. 添加域名：`your-domain.com`
3. 按照提示配置 DNS 记录

#### 3.2 后端域名（ECS）

1. 在 DNS 服务商添加 A 记录：
   - 主机：`api`
   - 值：ECS 公网 IP
   - TTL：600

2. 或使用 CNAME 指向负载均衡器

### 四、测试部署

#### 4.1 测试后端健康检查

```bash
curl https://api.your-domain.com/health
```

#### 4.2 测试前端连接

1. 访问 `https://your-domain.vercel.app`
2. 尝试访问 `/dream-factory`，应该跳转到登录页
3. 使用白名单账号登录
4. 测试积分扣除功能

## 🔧 维护命令

### 后端服务管理

```bash
# 查看状态
pm2 status

# 查看日志
pm2 logs ue-assets-backend

# 重启服务
pm2 restart ue-assets-backend

# 停止服务
pm2 stop ue-assets-backend

# 更新代码
cd /opt/ue-assets-backend
# 上传新代码后
npm install --production
pm2 restart ue-assets-backend
```

### 查看日志

```bash
# PM2 日志
pm2 logs ue-assets-backend

# Nginx 日志
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

## ⚠️ 注意事项

1. **环境变量同步**：确保 Vercel 和 ECS 的 JWT_SECRET 一致
2. **CORS 配置**：后端必须允许前端域名访问
3. **HTTPS**：生产环境必须使用 HTTPS
4. **密钥安全**：不要将密钥提交到 Git
5. **备份**：定期备份数据库（如果使用）

## 📊 监控建议

1. **PM2 监控**：`pm2 monit`
2. **服务器监控**：使用云服务商的监控服务
3. **日志收集**：使用 ELK 或类似工具
4. **错误追踪**：集成 Sentry 或类似服务









