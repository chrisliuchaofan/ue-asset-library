# 修复 404 Deploy Hook 错误

## 🔍 问题确认

**根本原因：**
- ❌ GitHub webhook 的 Push 事件交付失败
- ❌ 错误：`404 Not Found`
- ❌ 错误信息：`"The deploy hook with id f09Dyn0Z08 was not found in project"`
- ❌ Webhook URL: `https://api.vercel.com/v1/integrations/deploy/prj_ayv3orBK8dkkC0ElnbCj0GG4cL7m/f09Dyn0Z08`

**问题分析：**
- Deploy Hook ID `f09Dyn0Z08` 在 Vercel 项目中不存在
- 可能是 Deploy Hook 被删除，或者项目 ID 不匹配
- 需要重新创建 Deploy Hook 并更新 GitHub webhook URL

## 🚀 解决方案

### 方法 1：重新连接 Git 仓库（推荐，最简单）

这会自动创建新的 webhook：

1. **在 Vercel Dashboard**：
   - 进入项目 `ue-asset-library`
   - Settings → Git
   - 点击 **"Disconnect"** 按钮
   - 确认断开

2. **立即重新连接**：
   - 点击 **"Connect Git Repository"** 按钮
   - 选择 GitHub 账号
   - 选择仓库：`chrisliuchaofan/ue-asset-library`
   - 选择分支：`main`
   - 确认连接

3. **验证**：
   - 重新连接后，Vercel 会自动创建新的 webhook
   - 检查 GitHub Webhooks 页面，应该看到 webhook URL 更新
   - 推送测试 commit 验证自动部署

### 方法 2：手动创建新的 Deploy Hook（如果方法 1 不行）

1. **在 Vercel Dashboard 创建新的 Deploy Hook**：
   - 进入项目 `ue-asset-library`
   - Settings → Git
   - 滚动到 **"Deploy Hooks"** 部分
   - 点击 **"Create Hook"**
   - 填写：
     - **Name**: `github-push-trigger`
     - **Branch**: `main`
   - 点击 **"Create Hook"**
   - **立即复制新的 Hook URL**（格式：`https://api.vercel.com/v1/deployments/hooks/xxxxx`）

2. **在 GitHub 更新 Webhook URL**：
   - 访问：https://github.com/chrisliuchaofan/ue-asset-library/settings/hooks
   - 点击现有的 webhook 条目
   - 点击 **"Edit"** 按钮
   - 更新 **"Payload URL"**：
     - 删除旧的 URL
     - 粘贴新的 Deploy Hook URL
   - 点击 **"Update webhook"**

3. **验证**：
   - 推送测试 commit 验证自动部署

### 方法 3：删除旧 Webhook 并创建新的（如果方法 2 不行）

1. **在 GitHub 删除旧 Webhook**：
   - 访问：https://github.com/chrisliuchaofan/ue-asset-library/settings/hooks
   - 点击现有的 webhook 条目
   - 点击 **"Delete"** 按钮
   - 确认删除

2. **在 Vercel 创建新的 Deploy Hook**（同方法 2 的步骤 1）

3. **在 GitHub 添加新的 Webhook**：
   - 点击 **"Add webhook"** 按钮
   - 填写：
     - **Payload URL**: 粘贴新的 Deploy Hook URL
     - **Content type**: `application/json`
     - **Secret**: 留空
     - **Events**: 选择 "Just the push event"
   - 点击 **"Add webhook"**

4. **验证**：
   - 推送测试 commit 验证自动部署

## 📋 详细步骤（推荐：方法 1）

### 步骤 1：在 Vercel 重新连接 Git 仓库

1. **打开 Vercel Dashboard**：
   - https://vercel.com/dashboard
   - 进入项目 `ue-asset-library`

2. **断开连接**：
   - Settings → Git
   - 点击 **"Disconnect"** 按钮
   - 确认断开

3. **重新连接**：
   - 点击 **"Connect Git Repository"** 按钮
   - 选择 GitHub 账号
   - 选择仓库：`chrisliuchaofan/ue-asset-library`
   - 选择分支：`main`
   - 确认连接（会提示授权，确保授予所有权限）

4. **等待连接完成**：
   - 连接过程可能需要几秒钟
   - 连接成功后，Vercel 会自动创建新的 webhook

### 步骤 2：验证 Webhook 更新

1. **在 GitHub Webhooks 页面**：
   - 访问：https://github.com/chrisliuchaofan/ue-asset-library/settings/hooks
   - 点击 webhook 条目
   - 查看 **"Settings"** 标签
   - 检查 **"Payload URL"** 是否已更新
   - 新的 URL 应该不包含旧的 Deploy Hook ID `f09Dyn0Z08`

2. **检查 Recent Deliveries**：
   - 点击 **"Recent Deliveries"** 标签
   - 应该能看到新的 `ping` 事件（连接时的测试）
   - 状态应该是 `200` 或 `201`（成功）

### 步骤 3：测试自动部署

```bash
cd /Users/chrisl/Documents/恒星UE资产库/web
git commit --allow-empty -m "test: 验证修复后的 webhook"
git push
```

**推送后检查：**

1. **GitHub Webhooks → Recent Deliveries**：
   - 应该看到新的 `push` 事件交付
   - 状态应该是 `200` 或 `201`（成功，不再是 404）

2. **Vercel Dashboard → Deployments**：
   - 应该在 1-2 分钟内看到新的部署开始
   - 部署应该对应刚才推送的 commit

## 🔧 如果重新连接后仍然失败

### 检查 Vercel 项目设置

1. **确认项目状态**：
   - Vercel Dashboard → Overview
   - 确认项目状态是 "Active"

2. **检查项目 ID**：
   - Settings → General
   - 记录 Project ID
   - 对比 GitHub webhook URL 中的项目 ID

3. **检查 Auto-deploy 设置**：
   - Settings → Git
   - 确认 "Auto-deploy" 已启用
   - 确认 "Production Branch" 是 `main`

### 检查 GitHub 权限

1. **在 GitHub**：
   - Settings → Applications → Authorized OAuth Apps
   - 找到 Vercel
   - 检查权限是否包括：
     - ✅ Repository access
     - ✅ Webhook permissions

2. **如果权限不足**：
   - 在 Vercel 重新连接时会提示重新授权
   - 确保授予所有必需的权限

## 📋 验证清单

完成修复后，确认：

- [ ] Vercel Git 仓库已重新连接
- [ ] GitHub Webhook URL 已更新（不包含旧的 Deploy Hook ID）
- [ ] GitHub Webhook Recent Deliveries 显示新的 `ping` 事件（状态 200）
- [ ] 推送测试 commit 后，`push` 事件交付状态是 200（不再是 404）
- [ ] Vercel Dashboard 显示新的部署开始

## ⚡ 快速操作

**立即执行：**

1. Vercel Dashboard → Settings → Git → Disconnect
2. 立即点击 "Connect Git Repository" 重新连接
3. 等待连接完成
4. 推送测试 commit：
   ```bash
   cd /Users/chrisl/Documents/恒星UE资产库/web
   git commit --allow-empty -m "test: 验证修复后的 webhook"
   git push
   ```
5. 检查 GitHub Webhooks → Recent Deliveries（应该看到成功的 push 事件）
6. 检查 Vercel Dashboard → Deployments（应该看到新部署）

## 🎉 修复后的效果

一旦修复成功：
- ✅ 每次推送代码到 `main` 分支，Vercel 会自动部署
- ✅ GitHub Webhook 的 Push 事件交付状态是 200（成功）
- ✅ 不再出现 404 错误
- ✅ 可以在 Vercel Dashboard 看到所有自动部署







