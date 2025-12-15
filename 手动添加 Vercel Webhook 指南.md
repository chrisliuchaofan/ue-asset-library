# 手动添加 Vercel Webhook 指南

## 🔍 问题确认

即使重新连接了 Git 仓库，GitHub 仍然没有 webhook。这可能是：
- GitHub 权限问题
- Vercel 的 webhook 创建机制异常
- 需要手动配置

## 🚀 解决方案：手动添加 Webhook

### 方法 1：使用 Vercel CLI 获取 Webhook URL

```bash
# 1. 安装 Vercel CLI
npm i -g vercel

# 2. 登录
vercel login

# 3. 在项目目录中链接项目
cd /Users/chrisl/Documents/恒星UE资产库/web
vercel link

# 4. 查看项目信息（可能包含 webhook URL）
vercel inspect
```

### 方法 2：在 Vercel Dashboard 查找 Webhook URL

1. **检查 Deploy Hooks**：
   - 在 Vercel Dashboard → Settings → Git
   - 查看是否有 "Deploy Hooks" 部分
   - 如果有，可以创建一个 Deploy Hook 作为临时方案

2. **检查项目设置**：
   - Settings → General
   - 查看是否有 webhook 相关信息

### 方法 3：使用标准 Vercel Webhook URL（推荐）

Vercel 的 webhook URL 格式通常是：
```
https://api.vercel.com/v1/integrations/deploy/{integration-id}/{project-id}
```

但更简单的方法是使用 **Deploy Hooks**。

## 📋 详细步骤：创建 Deploy Hook 并配置为 Webhook

### 步骤 1：在 Vercel 创建 Deploy Hook

1. **在 Vercel Dashboard**：
   - 进入项目 `ue-asset-library`
   - 进入 **Settings** → **Git**
   - 滚动到 **"Deploy Hooks"** 部分
   - 点击 **"Create Hook"**

2. **配置 Hook**：
   - **Name**: `github-push-trigger`
   - **Branch**: `main`
   - 点击 **"Create Hook"**

3. **复制 Hook URL**：
   - 创建后会显示一个 URL，类似：
     ```
     https://api.vercel.com/v1/deployments/hooks/xxxxx
     ```
   - **复制这个 URL**（后面会用到）

### 步骤 2：在 GitHub 添加 Webhook

1. **访问 GitHub Webhooks 页面**：
   - https://github.com/chrisliuchaofan/ue-asset-library/settings/hooks
   - 点击 **"Add webhook"**

2. **配置 Webhook**：
   - **Payload URL**: 粘贴刚才复制的 Deploy Hook URL
   - **Content type**: 选择 `application/json`
   - **Secret**: （留空，Deploy Hook 不需要 secret）
   - **Which events would you like to trigger this webhook?**:
     - 选择 **"Just the push event"**（推荐）
     - 或者选择 **"Send me everything"**（如果只想监听 push）
   - **Active**: ✅ 确保勾选

3. **点击 "Add webhook"**

4. **验证**：
   - 添加后，GitHub 会立即发送一个测试请求
   - 检查 webhook 状态，应该显示绿色的 ✅
   - 如果显示 ❌，点击查看详情

### 步骤 3：测试 Webhook

```bash
# 推送一个测试 commit
cd /Users/chrisl/Documents/恒星UE资产库/web
git commit --allow-empty -m "test: 验证手动配置的 webhook"
git push
```

推送后：
1. 在 GitHub Webhooks 页面，点击刚创建的 webhook
2. 查看 "Recent Deliveries" 标签
3. 应该能看到一个新的 delivery（状态应该是 200 或 201）
4. 在 Vercel Dashboard 的 Deployments 页面，应该能看到新的部署开始

## 🔧 如果 Deploy Hook 方法不行

### 备选方案：使用 GitHub Actions 触发 Vercel 部署

如果 webhook 仍然不工作，可以使用 GitHub Actions 作为替代：

1. **创建 GitHub Actions Workflow**：
   ```yaml
   # .github/workflows/deploy-vercel.yml
   name: Deploy to Vercel
   
   on:
     push:
       branches:
         - main
   
   jobs:
     deploy:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v3
         - uses: amondnet/vercel-action@v20
           with:
             vercel-token: ${{ secrets.VERCEL_TOKEN }}
             vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
             vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
             vercel-args: '--prod'
   ```

2. **获取 Vercel Token 和 IDs**：
   ```bash
   # 使用 Vercel CLI
   vercel login
   vercel link
   # 会显示 Project ID 和 Org ID
   
   # 获取 Token
   # 在 Vercel Dashboard → Settings → Tokens → Create Token
   ```

3. **在 GitHub 添加 Secrets**：
   - Settings → Secrets and variables → Actions
   - 添加：
     - `VERCEL_TOKEN`
     - `VERCEL_ORG_ID`
     - `VERCEL_PROJECT_ID`

## 🔍 检查 GitHub 权限

如果上述方法都不行，可能是权限问题：

1. **检查 GitHub OAuth App 权限**：
   - GitHub → Settings → Applications → Authorized OAuth Apps
   - 找到 Vercel
   - 检查权限是否包括：
     - ✅ Repository access
     - ✅ Webhook permissions
     - ✅ Write access to webhooks

2. **重新授权**：
   - 在 Vercel Dashboard → Settings → Git
   - 点击 "Disconnect"
   - 重新连接时，确保授予所有权限

## 📋 验证清单

完成配置后，检查：

- [ ] Vercel Deploy Hook 已创建
- [ ] GitHub Webhook 已添加（使用 Deploy Hook URL）
- [ ] Webhook 状态是 "Active"（绿色）
- [ ] 推送测试 commit 后，GitHub Webhooks 页面显示新的 delivery
- [ ] Vercel Dashboard 显示新的部署开始

## ⚡ 快速命令

```bash
# 创建测试 commit
cd /Users/chrisl/Documents/恒星UE资产库/web
git commit --allow-empty -m "test: 验证 webhook"
git push

# 然后检查：
# 1. GitHub Webhooks 页面 → Recent Deliveries
# 2. Vercel Dashboard → Deployments
```

## 🆘 如果仍然不行

如果所有方法都试过了仍然不行，可能需要：
1. 联系 Vercel 支持
2. 使用 GitHub Actions 作为替代方案（更可靠）
3. 使用 Vercel CLI 手动部署（每次推送后运行 `vercel --prod`）

