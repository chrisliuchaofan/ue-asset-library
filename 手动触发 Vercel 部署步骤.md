# 手动触发 Vercel 部署步骤

## 🔍 问题分析

**当前状态：**
- ✅ 最新代码已推送到 GitHub（commit: `77bc1e9`）
- ❌ Vercel 显示的最新部署还是 5 小时前的 `80fcb2f`
- ❌ Vercel 没有自动检测到新的推送

**可能原因：**
1. Git webhook 失效或未正确配置
2. Vercel 项目与 GitHub 仓库连接断开
3. 部署队列卡住

## 🚀 解决方案：手动触发部署

### 方法 1：在 Vercel Dashboard 手动触发（最简单）

1. **访问 Vercel Dashboard**
   - 打开 https://vercel.com/dashboard
   - 登录你的账号
   - 找到项目 `ue-asset-library`

2. **进入 Deployments 页面**
   - 点击项目
   - 点击顶部的 **"Deployments"** 标签

3. **手动触发部署**
   - 点击右上角的 **"Deploy"** 按钮（或三个点菜单 → "Redeploy"）
   - 在弹出窗口中选择：
     - **Branch**: `main`
     - **Commit**: 选择最新的 commit `77bc1e9` 或 `chore: 触发 Vercel 部署`
   - 点击 **"Deploy"** 按钮

4. **等待部署完成**
   - 部署状态会显示为 "Building"
   - 完成后会显示 "Ready"
   - 通常需要 1-3 分钟

### 方法 2：使用 Vercel CLI（推荐用于调试）

```bash
# 1. 安装 Vercel CLI（如果还没有）
npm i -g vercel

# 2. 登录 Vercel
vercel login

# 3. 在项目目录中部署
cd /Users/chrisl/Documents/恒星UE资产库/web
vercel --prod

# 或者先部署到预览环境测试
vercel
```

### 方法 3：修复 Git Webhook（长期解决方案）

如果自动部署一直不工作，需要修复 Git webhook：

1. **在 Vercel Dashboard**：
   - 进入项目 → **Settings** → **Git**
   - 检查仓库连接状态
   - 如果显示 "Disconnected" 或有问题，点击 **"Disconnect"**
   - 然后点击 **"Connect Git Repository"**
   - 重新选择仓库：`chrisliuchaofan/ue-asset-library`
   - 选择分支：`main`
   - 确认连接

2. **验证 Webhook**：
   - 在 GitHub 仓库中：**Settings** → **Webhooks**
   - 查找 Vercel 的 webhook
   - 确认状态是 "Active"
   - 如果不存在或失效，Vercel 重新连接时会自动创建

## 📋 检查清单

部署前确认：
- [ ] 代码已推送到 GitHub（✅ 已完成：commit `77bc1e9`）
- [ ] Vercel 项目已连接正确的仓库
- [ ] 环境变量已配置（Settings → Environment Variables）
- [ ] 构建命令正确（通常是 `npm run build`）

部署后验证：
- [ ] 部署状态显示 "Ready"
- [ ] 访问网站确认功能正常
- [ ] 检查错误显示功能
- [ ] 检查模式切换功能
- [ ] 检查充值功能（开发环境）

## 🔧 如果仍然失败

### 检查构建日志

1. 在 Deployments 页面点击失败的部署
2. 查看 **"Build Logs"** 标签
3. 查找错误信息

### 常见错误及解决方案

1. **环境变量缺失**：
   - 在 Settings → Environment Variables 中添加缺失的变量

2. **构建命令失败**：
   - 检查 `package.json` 中的 `build` 脚本
   - 确认所有依赖都已安装

3. **Node.js 版本不匹配**：
   - 在 Settings → General → Node.js Version 中设置正确的版本

## ⚡ 快速操作命令

```bash
# 进入项目目录
cd /Users/chrisl/Documents/恒星UE资产库/web

# 安装并登录 Vercel CLI
npm i -g vercel && vercel login

# 部署到生产环境
vercel --prod
```

## 📝 备注

- 手动部署后，Vercel 应该会继续监听后续的 Git 推送
- 如果自动部署仍然不工作，建议修复 Git webhook（方法 3）
- 可以设置 GitHub Actions 作为备用部署方式（如果需要）

