# 修复 Vercel 自动部署

## 🔍 当前状态

从 Vercel Git 设置页面可以看到：
- ✅ Git 仓库已连接：`chrisliuchaofan/ue-asset-library`
- ✅ 连接日期：Nov 9（11月9日）
- ✅ 自动部署事件已启用：
  - `deployment_status Events`: Enabled
  - `repository_dispatch Events`: Enabled

但是：
- ❌ 最新代码（commit `77bc1e9`）没有触发自动部署
- ❌ Vercel 显示的最新部署还是 5 小时前的版本

## 🚀 解决方案

### 方法 1：重新连接 Git 仓库（推荐）

这会重新创建 GitHub webhook，通常能解决自动部署问题：

1. **在 Vercel Git 设置页面**：
   - 点击 **"Disconnect"** 按钮
   - 确认断开连接

2. **重新连接**：
   - 点击 **"Connect Git Repository"** 按钮
   - 选择 GitHub 账号
   - 选择仓库：`chrisliuchaofan/ue-asset-library`
   - 选择分支：`main`
   - 确认连接

3. **验证**：
   - 连接成功后，Vercel 会自动触发一次部署
   - 或者推送一个新的 commit 测试自动部署

### 方法 2：使用 Deploy Hooks（快速手动触发）

1. **在 Vercel Git 设置页面**：
   - 滚动到 **"Deploy Hooks"** 部分
   - 点击 **"Create Hook"**
   - 输入名称：`manual-deploy`
   - 选择分支：`main`
   - 点击 **"Create Hook"**

2. **使用 Hook URL**：
   ```bash
   # 复制生成的 Hook URL，然后执行：
   curl -X POST "YOUR_DEPLOY_HOOK_URL"
   ```

   或者直接在浏览器中访问 Hook URL（GET 请求也会触发部署）

### 方法 3：检查 GitHub Webhook 状态

1. **在 GitHub 仓库**：
   - 访问：https://github.com/chrisliuchaofan/ue-asset-library/settings/hooks
   - 查找 Vercel 的 webhook（通常显示为 `vercel.com`）
   - 检查状态：
     - ✅ 应该是 "Active"（绿色）
     - ❌ 如果是 "Inactive" 或显示错误，需要修复

2. **如果 webhook 失效**：
   - 在 Vercel 中重新连接 Git 仓库（方法 1）
   - 这会自动重新创建 webhook

### 方法 4：手动触发部署（临时方案）

如果上述方法都不行，可以：

1. **在 Vercel Dashboard**：
   - 进入项目 → **Deployments**
   - 点击右上角 **"Deploy"** 按钮
   - 选择最新的 commit `77bc1e9`
   - 点击 **"Deploy"**

## 📋 推荐操作流程

**立即执行（最快）：**

1. 在 Vercel Git 设置页面点击 **"Disconnect"**
2. 立即点击 **"Connect Git Repository"** 重新连接
3. 等待自动部署触发（通常 1-2 分钟）
4. 检查 Deployments 页面确认新部署开始

**验证自动部署：**

重新连接后，推送一个测试 commit：
```bash
git commit --allow-empty -m "test: 验证自动部署"
git push
```

如果 2-3 分钟内 Vercel 自动开始部署，说明修复成功。

## 🔧 如果问题仍然存在

### 检查 GitHub 权限

1. **在 GitHub**：
   - Settings → Applications → Authorized OAuth Apps
   - 查找 Vercel
   - 确认权限包括：
     - ✅ Repository access
     - ✅ Webhook permissions

2. **重新授权**：
   - 如果权限不足，在 Vercel 中重新连接时会提示重新授权

### 检查 Vercel 项目设置

1. **Build and Deployment Settings**：
   - 确认 **"Production Branch"** 设置为 `main`
   - 确认 **"Auto-deploy"** 已启用

2. **Environment Variables**：
   - 确认所有必需的环境变量都已配置

## ⚡ 快速命令（如果使用 CLI）

```bash
# 如果重新连接后仍然不工作，可以手动部署一次
cd /Users/chrisl/Documents/恒星UE资产库/web

# 安装 Vercel CLI（如果还没有）
npm i -g vercel

# 登录
vercel login

# 部署到生产环境
vercel --prod
```

## 📝 注意事项

- 重新连接 Git 仓库不会影响现有的部署
- 重新连接会重新创建 webhook，通常能解决自动部署问题
- 如果重新连接后自动部署仍然不工作，可能是 GitHub 权限问题

