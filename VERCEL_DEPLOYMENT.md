# Vercel 部署详细指南

## 前置准备

1. **GitHub 账号**（如果没有，去 [github.com](https://github.com) 注册）
2. **Vercel 账号**（如果没有，去 [vercel.com](https://vercel.com) 注册，可以用 GitHub 账号登录）

## 第一步：准备代码仓库

### 1.1 初始化 Git 仓库（如果还没有）

```bash
cd "/Users/shenghua/Documents/恒星UE资产库/web"

# 初始化 Git（如果还没有）
git init

# 创建 .gitignore（如果还没有）
# 确保 .gitignore 包含：
# - node_modules/
# - .next/
# - .env.local
# - .env*.local
```

### 1.2 创建 GitHub 仓库

1. 登录 [GitHub](https://github.com)
2. 点击右上角 "+" → "New repository"
3. 填写仓库信息：
   - Repository name: `ue-asset-library`（或你喜欢的名字）
   - Description: `UE 资产库展示系统`
   - 选择 Public 或 Private
   - **不要**勾选 "Initialize this repository with a README"
4. 点击 "Create repository"

### 1.3 推送代码到 GitHub

```bash
cd "/Users/shenghua/Documents/恒星UE资产库/web"

# 添加所有文件（.env.local 会被 .gitignore 忽略）
git add .

# 提交
git commit -m "Initial commit: UE 资产库项目"

# 添加远程仓库（替换 YOUR_USERNAME 为你的 GitHub 用户名）
git remote add origin https://github.com/YOUR_USERNAME/ue-asset-library.git

# 推送代码
git branch -M main
git push -u origin main
```

**注意**：如果提示需要认证，GitHub 现在需要使用 Personal Access Token：
1. GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. 生成新 token，勾选 `repo` 权限
3. 推送时用 token 代替密码

## 第二步：在 Vercel 部署

### 2.1 登录 Vercel

1. 访问 [vercel.com](https://vercel.com)
2. 点击 "Sign Up" 或 "Log In"
3. 选择 "Continue with GitHub"（使用 GitHub 账号登录）

### 2.2 导入项目

1. 登录后，点击 "Add New..." → "Project"
2. 在 "Import Git Repository" 中找到你的仓库 `ue-asset-library`
3. 点击 "Import"

### 2.3 配置项目

Vercel 会自动检测 Next.js 项目，配置如下：

**Framework Preset**: Next.js（自动检测）

**Root Directory**: `./`（默认）

**Build Command**: `npm run build`（默认）

**Output Directory**: `.next`（默认）

**Install Command**: `npm install`（默认）

### 2.4 配置环境变量

在 "Environment Variables" 部分，添加以下变量：

**方式 1：手动添加（推荐）**

在 Vercel 项目设置中，逐个添加以下变量：

```
STORAGE_MODE=oss
NEXT_PUBLIC_STORAGE_MODE=oss
NEXT_PUBLIC_CDN_BASE=/
OSS_BUCKET=guangzhougamead
OSS_REGION=oss-cn-guangzhou
OSS_ACCESS_KEY_ID=你的AccessKeyId
OSS_ACCESS_KEY_SECRET=你的AccessKeySecret
NEXT_PUBLIC_OSS_BUCKET=guangzhougamead
NEXT_PUBLIC_OSS_REGION=oss-cn-guangzhou
```

**方式 2：批量导入（如果 Vercel 支持）**

1. 打开项目根目录的 `vercel-env-template.txt` 文件
2. 将 `你的AccessKeyId` 和 `你的AccessKeySecret` 替换为实际值
3. 在 Vercel 的 "Environment Variables" 页面，如果有 "Import" 或 "Bulk Add" 功能，可以粘贴内容

**重要提示**：
- ⚠️ **必须添加** `NEXT_PUBLIC_OSS_BUCKET` 和 `NEXT_PUBLIC_OSS_REGION`，否则前端无法构建完整的 OSS URL
- 点击 "Add" 添加每个变量
- 选择环境：**Production**, **Preview**（根据需要选择）
- `NEXT_PUBLIC_CDN_BASE` 如果没配置 CDN，填 `/`（会自动使用 OSS 外网域名）
- 如果配置了 CDN，填你的 CDN 域名，例如：`https://cdn.example.com`

**详细配置说明**：参考 `VERCEL_ENV_VARIABLES.md` 文件

### 2.5 部署

1. 点击 "Deploy" 按钮
2. 等待构建完成（通常 2-5 分钟）
3. 部署成功后，会显示你的网站地址：
   - 格式：`https://ue-asset-library.vercel.app`
   - 或：`https://你的项目名.vercel.app`

## 第三步：配置自定义域名（可选）

### 3.1 在 Vercel 添加域名

1. 在项目页面，点击 "Settings" → "Domains"
2. 输入你的域名（例如：`assets.yourdomain.com`）
3. 按照提示配置 DNS：
   - 添加 CNAME 记录
   - 指向 Vercel 提供的地址

### 3.2 配置 HTTPS

Vercel 会自动为你的域名配置 HTTPS 证书（Let's Encrypt）

## 第四步：更新环境变量（如果需要）

如果部署后需要修改环境变量：

1. 在 Vercel 项目页面
2. 点击 "Settings" → "Environment Variables"
3. 修改或添加变量
4. 重新部署（会自动触发，或手动点击 "Redeploy"）

## 第五步：访问你的网站

部署成功后：

1. **访问地址**：
   - Vercel 提供的地址：`https://你的项目.vercel.app`
   - 或你的自定义域名

2. **测试功能**：
   - 访问首页：`https://你的域名/`
   - 访问资产列表：`https://你的域名/assets`
   - 访问后台管理：`https://你的域名/admin`

## 重要注意事项

### 1. 环境变量安全

- ✅ `.env.local` 已在 `.gitignore` 中，不会被提交
- ✅ 在 Vercel 中配置的环境变量是加密存储的
- ⚠️ 不要将 AccessKey 提交到 Git

### 2. OSS 权限

- 确保 OSS Bucket 有"公共读"权限，否则图片无法显示
- 或使用 CDN 加速

### 3. 后台管理页面

- 建议添加访问控制（登录验证）
- 或使用 Vercel 的密码保护功能

### 4. 自动部署

- 每次推送到 GitHub 的 `main` 分支，Vercel 会自动重新部署
- 可以在 Vercel 设置中配置预览部署（Pull Request 时）

## 常见问题

### Q: 部署失败怎么办？
A: 
1. 查看 Vercel 的构建日志
2. 检查环境变量是否正确
3. 确保 `package.json` 中的依赖都正确

### Q: 图片无法显示？
A:
1. 检查 OSS Bucket 是否开启"公共读"
2. 检查 `NEXT_PUBLIC_CDN_BASE` 配置
3. 在浏览器控制台查看图片 URL 是否正确

### Q: 如何更新代码？
A:
```bash
git add .
git commit -m "更新说明"
git push
```
Vercel 会自动重新部署

### Q: 如何回滚到之前的版本？
A:
1. 在 Vercel 项目页面
2. 点击 "Deployments"
3. 找到之前的版本，点击 "..." → "Promote to Production"

## 费用说明

- **Vercel Hobby 计划**：免费
  - 无限部署
  - 100GB 带宽/月
  - 适合个人项目和小型项目

- **如果需要更多资源**：可以升级到 Pro 计划（$20/月）

## 下一步

部署成功后，你可以：
1. 分享网址给别人访问
2. 继续在本地开发，推送到 GitHub 自动部署
3. 配置 CDN 加速图片加载
4. 添加自定义域名


