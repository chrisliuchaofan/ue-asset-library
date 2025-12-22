# 环境变量清单

## 📋 完整环境变量配置

### Vercel (Next.js 前端)

在 Vercel Dashboard → Settings → Environment Variables 配置：

```env
# ============================================
# NextAuth 认证配置
# ============================================
NEXTAUTH_SECRET=your-secret-key-change-in-production
NEXTAUTH_URL=https://your-domain.vercel.app

# ============================================
# 后端 API 配置
# ============================================
BACKEND_API_URL=https://api.your-domain.com
# 或使用 IP（测试环境）
# BACKEND_API_URL=http://your-ecs-ip:3001

# ============================================
# 用户白名单（可选，用于快速测试）
# 格式：邮箱:密码,邮箱:密码
# ============================================
USER_WHITELIST=user1@example.com:password1,user2@example.com:password2

# ============================================
# OSS 配置
# ============================================
OSS_BUCKET=your-bucket-name
OSS_REGION=oss-cn-hangzhou
OSS_ACCESS_KEY_ID=your-access-key-id
OSS_ACCESS_KEY_SECRET=your-access-key-secret
OSS_ENDPOINT=  # 可选
NEXT_PUBLIC_OSS_BUCKET=your-bucket-name
NEXT_PUBLIC_OSS_REGION=oss-cn-hangzhou
NEXT_PUBLIC_CDN_BASE=https://your-cdn-domain.com

# ============================================
# AI 服务配置
# ============================================
AI_IMAGE_API_KEY=your-qwen-api-key
AI_IMAGE_API_ENDPOINT=https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation
AI_IMAGE_API_MODEL=qwen-plus-latest
AI_VISION_MODEL=qwen-vl-plus-latest
AI_MULTIMODAL_MODEL=qwen3-omni-flash

# 即梦视频生成配置
JIMENG_REQ_KEY=jimeng_i2v_first_v30
# 可选值：
# - jimeng_i2v_first_v30 (720P，更经济)
# - jimeng_ti2v_v30_pro (1080P Pro，更高质量)

# ============================================
# 存储模式
# ============================================
STORAGE_MODE=oss
NEXT_PUBLIC_STORAGE_MODE=oss
```

### ECS (后端 API)

在 ECS 服务器上创建 `/opt/ue-assets-backend/.env` 文件：

```env
# ============================================
# 服务器配置
# ============================================
PORT=3001
NODE_ENV=production

# ============================================
# 前端地址（CORS）
# ============================================
FRONTEND_URL=https://your-domain.vercel.app

# ============================================
# JWT 密钥（必须与 NextAuth 一致）
# ============================================
JWT_SECRET=your-jwt-secret-key
# 或者使用与 NextAuth 相同的密钥
NEXTAUTH_SECRET=your-secret-key-change-in-production

# ============================================
# 用户白名单（可选，用于快速测试）
# 格式：邮箱:密码,邮箱:密码
# ============================================
USER_WHITELIST=user1@example.com:password1,user2@example.com:password2

# ============================================
# 积分系统配置
# ============================================
INITIAL_CREDITS=100

# ============================================
# 数据库配置（可选，如果使用数据库）
# ============================================
# MongoDB
# DATABASE_URL=mongodb://localhost:27017/ue-assets
# 或 PostgreSQL
# DATABASE_URL=postgresql://user:password@localhost:5432/ue-assets
```

## 🔑 密钥生成

### 生成 NEXTAUTH_SECRET

```bash
# 方法 1：使用 OpenSSL
openssl rand -base64 32

# 方法 2：使用 Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### 生成 JWT_SECRET

```bash
# 与 NEXTAUTH_SECRET 使用相同的值，或生成新的
openssl rand -base64 32
```

## ✅ 配置检查清单

### Vercel 配置检查

- [ ] `NEXTAUTH_SECRET` 已配置（强随机密钥）
- [ ] `NEXTAUTH_URL` 已配置（与 Vercel 域名一致）
- [ ] `BACKEND_API_URL` 已配置（后端 API 地址）
- [ ] `USER_WHITELIST` 已配置（至少一个测试账号）
- [ ] OSS 相关变量已配置
- [ ] AI 相关变量已配置

### ECS 配置检查

- [ ] `PORT` 已配置（默认 3001）
- [ ] `FRONTEND_URL` 已配置（Vercel 域名）
- [ ] `JWT_SECRET` 已配置（与 NextAuth 一致）
- [ ] `USER_WHITELIST` 已配置（与 Vercel 一致）
- [ ] `INITIAL_CREDITS` 已配置

## 🔒 安全建议

1. **使用强随机密钥**：至少 32 字符
2. **定期更换密钥**：建议每 3-6 个月更换
3. **不要提交到 Git**：确保 `.env` 在 `.gitignore` 中
4. **使用 HTTPS**：生产环境必须使用 HTTPS
5. **限制访问**：后端 API 只允许前端域名访问（CORS）

## 🧪 测试环境变量

### 测试后端连接

```bash
# 在浏览器控制台
fetch('https://api.your-domain.com/health')
  .then(r => r.json())
  .then(console.log);
```

### 测试前端配置

```bash
# 在浏览器控制台
fetch('/api/auth/session')
  .then(r => r.json())
  .then(console.log);
```








