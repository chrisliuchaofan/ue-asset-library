# 用户登录认证配置指南

## 📋 概述

本项目使用 NextAuth.js 实现用户登录认证功能，支持：
- ✅ 密码登录（多用户支持）
- ✅ 长期会话（30 天，关闭浏览器后保持登录）
- ✅ 仅保护 `/admin` 管理页面
- 🔄 钉钉登录（可选，需要企业认证）

## 🚀 快速配置

### 步骤 1：配置环境变量

在项目根目录的 `.env.local` 文件中添加以下配置：

```env
# NextAuth 配置
NEXTAUTH_SECRET=your-secret-key-change-in-production
NEXTAUTH_URL=http://localhost:3000  # 开发环境
# NEXTAUTH_URL=https://your-domain.com  # 生产环境

# 管理员账号配置（格式：用户名:密码，多个用户用逗号分隔）
ADMIN_USERS=admin:admin123,user1:password1,user2:password2
```

### 步骤 2：生成 NEXTAUTH_SECRET

**重要**：生产环境必须使用强随机密钥！

```bash
# 方法 1：使用 OpenSSL
openssl rand -base64 32

# 方法 2：使用 Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

将生成的密钥复制到 `NEXTAUTH_SECRET` 环境变量中。

### 步骤 3：重启开发服务器

```bash
# 停止当前服务器（Ctrl + C）
# 然后重新启动
npm run dev
```

## 🔐 管理员账号配置

### 方式 1：环境变量配置（推荐）

在 `.env.local` 中配置：

```env
ADMIN_USERS=admin:admin123,zhangsan:password123,lisi:password456
```

格式说明：
- 每个用户格式：`用户名:密码`
- 多个用户用逗号 `,` 分隔
- 不支持空格（用户名和密码中不能包含空格）

### 方式 2：兼容旧配置（单用户）

如果只配置了 `NEXT_PUBLIC_ADMIN_PASSWORD`，系统会自动创建一个默认用户：

```env
NEXT_PUBLIC_ADMIN_PASSWORD=admin123
```

默认用户名：`admin`

## 🌐 Vercel 生产环境配置

### 1. 登录 Vercel Dashboard

访问 [Vercel Dashboard](https://vercel.com/dashboard)，找到你的项目。

### 2. 进入环境变量设置

1. 点击项目名称进入项目页面
2. 点击 **Settings**（设置）
3. 点击 **Environment Variables**（环境变量）

### 3. 添加必需的环境变量

| 变量名 | 值 | 说明 | 环境 |
|--------|-----|------|------|
| `NEXTAUTH_SECRET` | `生成的随机密钥` | NextAuth 加密密钥（必须） | Production, Preview |
| `NEXTAUTH_URL` | `https://your-domain.vercel.app` | 应用完整 URL | Production, Preview |
| `ADMIN_USERS` | `admin:password123,user1:pass1` | 管理员账号列表 | Production, Preview |

### 4. 保存并重新部署

1. 添加完所有变量后，点击 **Save**
2. 进入 **Deployments** 页面
3. 找到最新的部署，点击 **...** 菜单
4. 选择 **Redeploy**

**重要**：修改环境变量后，必须重新部署才能生效！

## 🔄 钉钉登录配置（可选）

### 前置条件

1. 需要企业认证的钉钉账号
2. 在钉钉开放平台创建应用
3. 获取 AppKey 和 AppSecret

### 配置步骤

1. **在钉钉开放平台创建应用**
   - 访问：https://open.dingtalk.com/
   - 创建企业内部应用或第三方企业应用
   - 获取 AppKey（Client ID）和 AppSecret（Client Secret）

2. **配置回调地址**
   - 在钉钉应用设置中，配置授权回调地址：
   - `https://your-domain.com/api/auth/callback/dingtalk`

3. **添加环境变量**

```env
# 钉钉 OAuth 配置
DINGTALK_CLIENT_ID=your-app-key
DINGTALK_CLIENT_SECRET=your-app-secret
```

4. **启用钉钉登录**

编辑 `app/api/auth/[...nextauth]/route.ts`，取消注释钉钉 Provider 部分。

## 📝 使用说明

### 访问管理页面

1. 直接访问 `/admin` 页面
2. 如果未登录，会自动跳转到 `/auth/login` 登录页面
3. 输入用户名和密码登录
4. 登录成功后自动跳转回 `/admin` 页面

### 登录状态

- **会话时长**：30 天
- **更新频率**：每 24 小时更新一次会话
- **关闭浏览器**：会话会保持（使用 localStorage）

### 登出

在管理页面添加登出按钮（可选）：

```tsx
import { signOut } from 'next-auth/react';

<button onClick={() => signOut({ callbackUrl: '/' })}>
  登出
</button>
```

## 🔍 验证配置

### 1. 检查环境变量

在浏览器控制台运行（开发环境）：

```javascript
// 检查 NextAuth 是否正常工作
fetch('/api/auth/session').then(r => r.json()).then(console.log);
```

### 2. 测试登录

1. 访问 `/admin` 页面
2. 应该自动跳转到 `/auth/login`
3. 输入配置的用户名和密码
4. 登录成功后应该能访问 `/admin` 页面

## ⚠️ 常见问题

### 问题 1：登录后仍然跳转到登录页

**原因**：`NEXTAUTH_SECRET` 未配置或配置错误

**解决**：
1. 检查 `.env.local` 中是否有 `NEXTAUTH_SECRET`
2. 确认密钥长度足够（建议 32 字符以上）
3. 重启开发服务器

### 问题 2：生产环境登录失败

**原因**：Vercel 环境变量未配置或 `NEXTAUTH_URL` 不正确

**解决**：
1. 检查 Vercel 环境变量设置
2. 确认 `NEXTAUTH_URL` 与你的实际域名一致
3. 重新部署应用

### 问题 3：多用户配置不生效

**原因**：环境变量格式错误

**解决**：
- 确认格式：`用户名:密码,用户名:密码`
- 用户名和密码中不能包含 `:` 和 `,`
- 不能有多余的空格

### 问题 4：会话过期太快

**原因**：默认会话时长为 30 天

**解决**：
如需修改，编辑 `app/api/auth/[...nextauth]/route.ts` 中的 `session.maxAge` 配置。

## 🔒 安全建议

1. **生产环境必须使用强随机密钥**：使用 `openssl rand -base64 32` 生成
2. **不要将 `.env.local` 提交到 Git**：已在 `.gitignore` 中配置
3. **定期更换密码**：修改 `ADMIN_USERS` 环境变量
4. **使用 HTTPS**：生产环境必须使用 HTTPS
5. **限制管理员数量**：只添加必要的管理员账号

## 📚 相关文档

- [NextAuth.js 官方文档](https://next-auth.js.org/)
- [NextAuth.js GitHub](https://github.com/nextauthjs/next-auth)
- [钉钉开放平台](https://open.dingtalk.com/)

