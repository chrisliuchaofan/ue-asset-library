# 使用 Deploy Hook 配置 Webhook（最可靠的方法）

## 🎯 问题

即使重新连接了 Git 仓库，GitHub 仍然没有自动创建 webhook。这是因为 Vercel 的自动 webhook 创建可能因为权限或其他原因失败。

## ✅ 解决方案：使用 Deploy Hook

这是最可靠的方法，可以绕过 Vercel 的自动 webhook 创建机制。

## 📋 详细步骤

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
     - **Name**: `github-push-trigger`（或任意名称）
     - **Branch**: 选择 `main`
   - 点击 **"Create Hook"**

4. **复制 Hook URL**：
   - 创建后会显示一个 URL，格式类似：
     ```
     https://api.vercel.com/v1/deployments/hooks/xxxxxxxxxxxxxxxx
     ```
   - **⚠️ 重要：立即复制这个 URL，只显示一次！**
   - 如果关闭了，可以删除这个 hook 重新创建

### 步骤 2：在 GitHub 添加 Webhook

1. **打开 GitHub Webhooks 页面**：
   - 访问：https://github.com/chrisliuchaofan/ue-asset-library/settings/hooks
   - 或者：仓库 → Settings → Webhooks

2. **添加 Webhook**：
   - 点击 **"Add webhook"** 按钮

3. **配置 Webhook**：
   - **Payload URL**: 
     - 粘贴刚才从 Vercel 复制的 Deploy Hook URL
     - 格式：`https://api.vercel.com/v1/deployments/hooks/xxxxx`
   
   - **Content type**: 
     - 选择 `application/json`
   
   - **Secret**: 
     - **留空**（Deploy Hook 不需要 secret）
   
   - **Which events would you like to trigger this webhook?**:
     - 选择 **"Just the push event"**（推荐）
     - 这样只有 push 事件会触发部署
   
   - **Active**: 
     - ✅ 确保勾选（默认已勾选）

4. **保存**：
   - 点击 **"Add webhook"** 按钮
   - GitHub 会立即发送一个测试请求

5. **验证**：
   - 添加后，页面会显示 webhook 列表
   - 找到刚添加的 webhook，状态应该是绿色的 ✅
   - 如果显示 ❌，点击查看详情，查看错误信息

### 步骤 3：测试 Webhook

1. **推送测试 commit**：
   ```bash
   cd /Users/chrisl/Documents/恒星UE资产库/web
   git commit --allow-empty -m "test: 验证 Deploy Hook webhook"
   git push
   ```

2. **检查 GitHub Webhook 状态**：
   - 访问：https://github.com/chrisliuchaofan/ue-asset-library/settings/hooks
   - 点击刚创建的 webhook
   - 查看 **"Recent Deliveries"** 标签
   - 应该能看到一个新的 delivery
   - 状态应该是 `200` 或 `201`（绿色）

3. **检查 Vercel 部署**：
   - 访问 Vercel Dashboard → Deployments
   - 应该能看到新的部署开始（通常在 1-2 分钟内）
   - 部署状态会显示 "Building" 然后变为 "Ready"

## 🔍 故障排查

### 如果 GitHub Webhook 显示错误

1. **检查 URL 格式**：
   - 确保 URL 是完整的，没有多余的空格
   - 格式应该是：`https://api.vercel.com/v1/deployments/hooks/xxxxx`

2. **检查 Content Type**：
   - 必须是 `application/json`

3. **查看错误详情**：
   - 在 GitHub Webhooks 页面，点击 webhook
   - 查看 "Recent Deliveries" 中的错误信息
   - 常见错误：
     - `404 Not Found`: URL 错误或 Deploy Hook 已删除
     - `401 Unauthorized`: 权限问题（通常不会出现，因为 Deploy Hook 不需要 secret）

### 如果 Vercel 没有开始部署

1. **检查 Deploy Hook 是否有效**：
   - 在 Vercel Dashboard → Settings → Git → Deploy Hooks
   - 确认 hook 仍然存在
   - 可以点击 hook 右侧的 "..." 菜单 → "Test Hook" 测试

2. **手动触发测试**：
   ```bash
   # 使用 curl 测试 Deploy Hook URL
   curl -X POST "YOUR_DEPLOY_HOOK_URL"
   ```
   - 如果返回成功，说明 hook 有效
   - 然后检查 Vercel Dashboard 是否开始部署

3. **检查分支设置**：
   - 确保 Deploy Hook 配置的分支是 `main`
   - 确保你推送的代码是在 `main` 分支

## 📋 验证清单

完成配置后，确认：

- [ ] Vercel Deploy Hook 已创建
- [ ] Deploy Hook URL 已复制
- [ ] GitHub Webhook 已添加（使用 Deploy Hook URL）
- [ ] Webhook 状态是 "Active"（绿色）
- [ ] 推送测试 commit 后，GitHub 显示新的 delivery（状态 200）
- [ ] Vercel Dashboard 显示新的部署开始

## ⚡ 快速命令

```bash
# 测试 webhook
cd /Users/chrisl/Documents/恒星UE资产库/web
git commit --allow-empty -m "test: 验证 webhook"
git push

# 然后检查：
# 1. GitHub: https://github.com/chrisliuchaofan/ue-asset-library/settings/hooks
# 2. Vercel: https://vercel.com/dashboard → Deployments
```

## 🎉 成功后

一旦配置成功：
- ✅ 每次推送代码到 `main` 分支，Vercel 会自动部署
- ✅ 不再需要手动触发部署
- ✅ 可以在 Vercel Dashboard 的 Deployments 页面看到所有自动部署

## 📝 注意事项

- **Deploy Hook URL 只显示一次**：创建后立即复制，如果丢失需要删除重新创建
- **一个 Deploy Hook 可以用于多个 webhook**：如果需要，可以在多个 GitHub 仓库中使用同一个 hook
- **Deploy Hook 不会过期**：除非手动删除，否则一直有效

