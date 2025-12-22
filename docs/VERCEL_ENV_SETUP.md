# Vercel 环境变量配置指南

## 问题诊断

如果资产列表显示为空（0 个资产），通常是因为缺少 Supabase 环境变量。

## 必需的环境变量

### 1. Supabase 配置（必需）

在 Vercel Dashboard → Settings → Environment Variables 中添加：

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

**如何获取这些值：**
1. 登录 [Supabase Dashboard](https://app.supabase.com)
2. 选择你的项目
3. 进入 Settings → API
4. 复制以下值：
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`（⚠️ 保密，不要暴露到客户端）

### 2. NextAuth 配置（必需）

```
NEXTAUTH_SECRET=your-secret-key-at-least-32-characters
NEXTAUTH_URL=https://ue-asset-library.vercel.app
```

**生成 NEXTAUTH_SECRET：**
```bash
openssl rand -base64 32
```

**NEXTAUTH_URL 设置：**
- 生产环境：`https://ue-asset-library.vercel.app`
- 预览环境：使用 Vercel 自动生成的预览 URL

### 3. 管理员账号配置（必需）

```
ADMIN_USERS=admin:admin123
```

格式：`用户名:密码,用户名2:密码2`

### 4. 存储模式配置（必需）

```
STORAGE_MODE=oss
NEXT_PUBLIC_STORAGE_MODE=oss
```

### 5. OSS 配置（如果使用 OSS 存储）

```
OSS_BUCKET=your-bucket-name
OSS_REGION=oss-cn-hangzhou
OSS_ACCESS_KEY_ID=your-access-key-id
OSS_ACCESS_KEY_SECRET=your-access-key-secret
NEXT_PUBLIC_OSS_BUCKET=your-bucket-name
NEXT_PUBLIC_OSS_REGION=oss-cn-hangzhou
NEXT_PUBLIC_CDN_BASE=https://your-cdn-domain.com
```

## 环境变量检查清单

在 Vercel Dashboard 中确认以下变量已配置：

- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `NEXTAUTH_SECRET`
- [ ] `NEXTAUTH_URL`
- [ ] `ADMIN_USERS`
- [ ] `STORAGE_MODE`
- [ ] `NEXT_PUBLIC_STORAGE_MODE`

## 配置后操作

1. **重新部署**：在 Vercel Dashboard 中点击 "Redeploy"
2. **检查日志**：查看部署日志，确认没有环境变量缺失错误
3. **验证功能**：
   - 访问资产列表页面，应该能看到资产
   - 访问管理页面，应该能正常登录

## 常见问题

### Q: 为什么资产列表显示为空？

A: 检查是否配置了 Supabase 环境变量。如果未配置，系统会回退到 `manifest.json`，但如果该文件不存在或为空，就会显示 0 个资产。

### Q: CORS 错误怎么办？

A: 检查 `NEXTAUTH_URL` 是否与当前访问的域名一致。如果使用自定义域名，需要更新 `NEXTAUTH_URL`。

### Q: 如何验证环境变量是否正确？

A: 在 Vercel Dashboard → Functions → 查看函数日志，查找 `[AssetsPage]` 或 `[getAllAssets]` 的日志输出。

## 调试日志

配置环境变量后，在浏览器控制台（F12）和 Vercel 函数日志中会看到：

- `[AssetsPage] Supabase query: totalCount=721` - 表示成功从 Supabase 读取数据
- `[AssetsPage] ⚠️ Supabase 环境变量未配置` - 表示缺少环境变量

