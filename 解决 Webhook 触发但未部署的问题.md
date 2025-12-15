# 解决 Webhook 触发但未部署的问题

## 🔍 当前状态

**GitHub Webhook：**
- ✅ 多个 Push 事件交付成功（绿色勾）
- ✅ 最新 Push 事件：00:50:09, 00:46:26, 00:35:18
- ✅ Webhook 正常工作

**Vercel Deployments：**
- ❌ 最新部署是 6-7 小时前的
- ❌ 没有看到对应最新 Push 事件的部署
- ❌ Webhook 触发成功，但 Vercel 没有创建部署

## 🎯 根本原因

从 GitHub Webhook 的 URL 可以看到，当前使用的是 **Integration URL**：
```
https://api.vercel.com/v1/integrations/deploy/prj_ayv3orBK8dkkC0ElnbCjOGG4cL7m/1v6tsltD3H
```

**Integration URL 的问题：**
- Integration URL 可能不会自动触发部署
- 它主要用于集成配置，不是专门用于触发部署的
- 需要使用 **Deploy Hook URL** 才能可靠地触发部署

## 🚀 解决方案：使用 Deploy Hook URL

### 步骤 1：在 Vercel 创建 Deploy Hook

1. **打开 Vercel Dashboard**：
   - 访问：https://vercel.com/dashboard
   - 进入项目 `ue-asset-library`

2. **进入 Git 设置**：
   - 点击 **Settings** 标签
   - 在左侧菜单点击 **Git**

3. **创建 Deploy Hook**：
   - 滚动到 **"Deploy Hooks"** 部分
   - 点击 **"Create Hook"** 按钮
   - 填写：
     - **Name**: `github-push-trigger`
     - **Branch**: 选择 `main`
   - 点击 **"Create Hook"**

4. **复制 Hook URL**：
   - 创建后会显示一个 URL，格式类似：
     ```
     https://api.vercel.com/v1/deployments/hooks/xxxxxxxxxxxxxxxx
     ```
   - **⚠️ 重要：立即复制这个 URL，只显示一次！**
   - 注意：这是 `/v1/deployments/hooks/...` 格式，不是 `/v1/integrations/deploy/...`

### 步骤 2：在 GitHub 更新 Webhook URL

1. **打开 GitHub Webhooks 页面**：
   - 访问：https://github.com/chrisliuchaofan/ue-asset-library/settings/hooks
   - 点击现有的 webhook 条目

2. **编辑 Webhook**：
   - 点击 **"Edit"** 按钮
   - 找到 **"Payload URL"** 字段

3. **更新 URL**：
   - **删除旧的 Integration URL**：
     ```
     https://api.vercel.com/v1/integrations/deploy/prj_ayv3orBK8dkkC0ElnbCjOGG4cL7m/1v6tsltD3H
     ```
   - **粘贴新的 Deploy Hook URL**（从步骤 1 复制的）：
     ```
     https://api.vercel.com/v1/deployments/hooks/xxxxxxxxxxxxxxxx
     ```
   - 确认其他设置：
     - **Content type**: `application/json`
     - **Secret**: 留空（Deploy Hook 不需要 secret）
     - **Events**: 选择 "Just the push event"
   - 点击 **"Update webhook"**

4. **验证**：
   - GitHub 会立即发送一个测试请求（ping 事件）
   - 检查 webhook 状态，应该是绿色的 ✅

### 步骤 3：测试自动部署

```bash
cd /Users/chrisl/Documents/恒星UE资产库/web
git commit --allow-empty -m "test: 验证 Deploy Hook URL 自动部署"
git push
```

**推送后立即检查：**

1. **GitHub Webhooks → Recent Deliveries**：
   - 应该看到新的 `push` 事件交付
   - 状态应该是 `200` 或 `201`（成功）

2. **Vercel Dashboard → Deployments**：
   - **应该在 1-2 分钟内看到新的部署开始**
   - 部署应该对应刚才推送的 commit
   - 状态会从 "Building" 变为 "Ready"

## 🔍 为什么 Integration URL 不工作？

**Integration URL vs Deploy Hook URL：**

1. **Integration URL** (`/v1/integrations/deploy/...`)：
   - 用于 Vercel 的集成配置
   - 主要用于连接 Git 仓库
   - **可能不会自动触发部署**

2. **Deploy Hook URL** (`/v1/deployments/hooks/...`)：
   - 专门用于触发部署
   - 设计用于 webhook 集成
   - **会可靠地触发部署**

## 📋 验证清单

完成配置后，确认：

- [ ] Vercel Deploy Hook 已创建（格式：`/v1/deployments/hooks/...`）
- [ ] GitHub Webhook URL 已更新为 Deploy Hook URL
- [ ] GitHub Webhook Recent Deliveries 显示 ping 事件（状态 200）
- [ ] 推送测试 commit 后，push 事件交付成功（状态 200）
- [ ] **Vercel Dashboard → Deployments 显示新的部署开始**（关键！）

## ⚡ 立即操作

**请按照以下步骤操作：**

1. **在 Vercel 创建 Deploy Hook**（步骤 1）
   - 注意：URL 格式必须是 `/v1/deployments/hooks/...`
   - 不是 `/v1/integrations/deploy/...`

2. **在 GitHub 更新 Webhook URL**（步骤 2）
   - 替换为新的 Deploy Hook URL

3. **推送测试 commit**（步骤 3）
   ```bash
   cd /Users/chrisl/Documents/恒星UE资产库/web
   git commit --allow-empty -m "test: 验证 Deploy Hook 自动部署"
   git push
   ```

4. **立即检查 Vercel Deployments**：
   - 应该在 1-2 分钟内看到新部署
   - 如果仍然没有，检查 Vercel 项目设置

## 🔧 如果仍然不工作

### 检查 Vercel 项目设置

1. **检查 Auto-deploy**：
   - Vercel Dashboard → Settings → Git
   - 确认 **"Auto-deploy"** 已启用
   - 确认 **"Production Branch"** 是 `main`

2. **检查项目状态**：
   - Overview 页面
   - 确认项目状态是 "Active"

3. **检查部署队列**：
   - Deployments 页面
   - 查看是否有卡住的部署
   - 取消卡住的部署后重试

### 手动触发部署测试

如果自动部署仍然不工作，手动触发一次：

1. **在 Vercel Dashboard**：
   - 进入 Deployments 页面
   - 点击右上角 **"Deploy"** 按钮
   - 选择最新的 commit
   - 点击 **"Deploy"**

2. **观察部署过程**：
   - 部署应该立即开始
   - 查看构建日志
   - 确认部署是否成功

3. **如果手动部署成功**：
   - 说明项目配置正常
   - 问题在于 webhook 没有触发部署
   - 确认使用的是 Deploy Hook URL（不是 Integration URL）

## 🎯 关键点

- **URL 格式很重要**：
  - ❌ Integration URL: `/v1/integrations/deploy/...`（可能不触发部署）
  - ✅ Deploy Hook URL: `/v1/deployments/hooks/...`（会触发部署）

- **验证方法**：
  - 推送代码后，Vercel Deployments 应该在 1-2 分钟内显示新部署
  - 如果 5 分钟后仍然没有，说明配置有问题

## 📝 总结

**问题根源：**
- 当前使用的是 Integration URL，不会自动触发部署

**解决方案：**
- 使用 Deploy Hook URL 替换 Integration URL

**验证方法：**
- 推送代码后，检查 Vercel Deployments 是否在 1-2 分钟内显示新部署

