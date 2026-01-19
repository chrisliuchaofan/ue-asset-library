# 环境变量清单

## 📋 完整环境变量配置

**注意**：项目已完全迁移到 Supabase，不再需要单独的 ECS 后端服务器。

---

### Vercel (Next.js 前端)

在 Vercel Dashboard → Settings → Environment Variables 配置：

```env
# ============================================
# NextAuth 认证配置（必需）
# ============================================
NEXTAUTH_SECRET=your-secret-key-change-in-production
NEXTAUTH_URL=https://your-domain.vercel.app

# 管理员账号配置（格式：用户名:密码，多个用户用逗号分隔）
ADMIN_USERS=admin:admin123

# ============================================
# Supabase 配置（必需）
# ============================================
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# ============================================
# 存储模式配置
# ============================================
# local: 使用本地文件系统（data/manifest.json）- 仅用于本地开发调试
# oss: 使用阿里云 OSS - 生产环境必须使用此模式
STORAGE_MODE=oss
NEXT_PUBLIC_STORAGE_MODE=oss

# ============================================
# 阿里云 OSS 配置（生产环境必需）
# ============================================
OSS_BUCKET=your-bucket-name
OSS_REGION=oss-cn-hangzhou
OSS_ACCESS_KEY_ID=your-access-key-id
OSS_ACCESS_KEY_SECRET=your-access-key-secret
OSS_ENDPOINT=  # 可选，如果不填会自动根据 region 生成
NEXT_PUBLIC_OSS_BUCKET=your-bucket-name
NEXT_PUBLIC_OSS_REGION=oss-cn-hangzhou
NEXT_PUBLIC_CDN_BASE=https://your-cdn-domain.com

# ============================================
# AI 服务配置（可选）
# ============================================
# 通义千问配置
AI_IMAGE_API_PROVIDER=aliyun
AI_IMAGE_API_ENDPOINT=https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions
AI_IMAGE_API_KEY=your-qwen-api-key
AI_IMAGE_API_MODEL=qwen-vl-plus-latest
AI_IMAGE_API_TIMEOUT=30000
AI_IMAGE_API_STRICT=false

# 即梦工厂配置（火山引擎）
JIMENG_ACCESS_KEY=your-jimeng-access-key
JIMENG_SECRET_KEY=your-jimeng-secret-key
JIMENG_API_ENDPOINT=https://visual.volcengineapi.com
JIMENG_REGION=cn-north-1
WANX_API_ENDPOINT=https://dashscope.aliyuncs.com/api/v1/services/aigc/image-generation/generation
WANX_MODEL=wan2.6-image
```

---

## 🔑 密钥生成

### 生成 NEXTAUTH_SECRET

```bash
# 方法 1：使用 OpenSSL
openssl rand -base64 32

# 方法 2：使用 Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

---

## ✅ 配置检查清单

### Vercel 配置检查

#### 必需配置
- [ ] `NEXTAUTH_SECRET` 已配置（强随机密钥，至少 32 字符）
- [ ] `NEXTAUTH_URL` 已配置（与 Vercel 域名一致）
- [ ] `NEXT_PUBLIC_SUPABASE_URL` 已配置（Supabase 项目 URL）
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` 已配置（Supabase Anon Key）
- [ ] `SUPABASE_SERVICE_ROLE_KEY` 已配置（Supabase Service Role Key，⚠️ 仅在服务端使用）

#### 生产环境必需
- [ ] `STORAGE_MODE` 已配置为 `oss`（生产环境必须）
- [ ] `NEXT_PUBLIC_STORAGE_MODE` 已配置为 `oss`（生产环境必须）
- [ ] `OSS_BUCKET` 已配置
- [ ] `OSS_REGION` 已配置
- [ ] `OSS_ACCESS_KEY_ID` 已配置
- [ ] `OSS_ACCESS_KEY_SECRET` 已配置
- [ ] `NEXT_PUBLIC_CDN_BASE` 已配置（CDN 域名）

#### 可选配置
- [ ] `ADMIN_USERS` 已配置（管理员账号）
- [ ] `AI_IMAGE_API_KEY` 已配置（如需使用 AI 功能）
- [ ] `JIMENG_ACCESS_KEY` 和 `JIMENG_SECRET_KEY` 已配置（如需使用即梦工厂功能）

---

## 🔒 安全建议

1. **使用强随机密钥**：至少 32 字符
2. **定期更换密钥**：建议每 3-6 个月更换
3. **不要提交到 Git**：确保 `.env.local` 在 `.gitignore` 中
4. **使用 HTTPS**：生产环境必须使用 HTTPS
5. **保护 Service Role Key**：
   - `SUPABASE_SERVICE_ROLE_KEY` 仅在服务端使用，不要暴露到客户端
   - 不要在客户端代码中使用此密钥
   - 如果密钥泄露，立即在 Supabase Dashboard 中重新生成

---

## 🧪 测试环境变量

### 测试 Supabase 连接

```bash
# 在浏览器控制台
fetch('/api/check-supabase')
  .then(r => r.json())
  .then(console.log);
```

应该返回 Supabase 连接状态。

### 测试 NextAuth 配置

```bash
# 在浏览器控制台
fetch('/api/auth/session')
  .then(r => r.json())
  .then(console.log);
```

应该返回当前登录用户信息（如果已登录）或 `null`（如果未登录）。

---

## 📚 相关文档

- `DEPLOYMENT_GUIDE.md` - 完整部署指南
- `docs/SUPABASE_ADMIN_SETUP.md` - Supabase 配置指南
- `docs/ECS_BACKEND_MIGRATION.md` - 从 ECS 后端迁移指南

---

## ⚠️ 废弃的环境变量

以下环境变量已废弃，不应再使用：

- ❌ `BACKEND_API_URL` - 已移除，不再需要单独的 ECS 后端服务器
- ❌ `NEXT_PUBLIC_BACKEND_API_URL` - 已移除，不再需要单独的 ECS 后端服务器
- ❌ `JWT_SECRET` - 已移除，使用 `NEXTAUTH_SECRET` 代替
- ❌ `FRONTEND_URL` - 已移除，不需要后端服务器 CORS 配置
- ❌ `USER_WHITELIST` - 已移除，用户管理已迁移到 Supabase
- ❌ `INITIAL_CREDITS` - 已移除，积分系统已迁移到 Supabase

如果您的代码或文档中仍在使用这些变量，请更新为新的 Supabase 配置。