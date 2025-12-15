# 手动创建 Deploy Hook 并配置 Webhook

## 🔍 问题

重新连接 Git 仓库后，Vercel 没有自动创建 webhook。这可能是由于：

1. **GitHub 权限不足**：Vercel 可能没有创建 webhook 的权限
2. **Vercel 的自动 webhook 创建机制问题**：某些情况下不会自动创建
3. **需要手动配置**：某些项目需要手动创建 Deploy Hook

## 🚀 解决方案：手动创建 Deploy Hook

这是最可靠的方法，可以完全控制 webhook 配置。

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

### 步骤 2：在 GitHub 更新或创建 Webhook

#### 选项 A：更新现有 Webhook（如果存在）

1. **打开 GitHub Webhooks 页面**：
   - 访问：https://github.com/chrisliuchaofan/ue-asset-library/settings/hooks

2. **编辑现有 Webhook**：
   - 如果已经有 webhook，点击它
   - 点击 **"Edit"** 按钮
   - 更新 **"Payload URL"**：
     - 删除旧的 URL（包含失效的 Deploy Hook ID `f09Dyn0Z08`）
     - 粘贴新的 Deploy Hook URL（从步骤 1 复制的）
   - 确认其他设置：
     - **Content type**: `application/json`
     - **Secret**: 留空（Deploy Hook 不需要 secret）
     - **Events**: 选择 "Just the push event"
   - 点击 **"Update webhook"**

#### 选项 B：创建新的 Webhook（如果没有或想重新创建）

1. **删除旧 Webhook**（如果存在）：
   - 在 GitHub Webhooks 页面
   - 点击现有的 webhook
   - 点击 **"Delete"** 按钮
   - 确认删除

2. **创建新 Webhook**：
   - 点击 **"Add webhook"** 按钮
   - 填写：
     - **Payload URL**: 粘贴从 Vercel 复制的 Deploy Hook URL
     - **Content type**: `application/json`
     - **Secret**: 留空
     - **Which events would you like to trigger this webhook?**:
       - 选择 **"Just the push event"**
     - **Active**: ✅ 确保勾选
   - 点击 **"Add webhook"**

3. **验证**：
   - GitHub 会立即发送一个测试请求（ping 事件）
   - 检查 webhook 状态，应该是绿色的 ✅
   - 如果显示 ❌，点击查看详情

### 步骤 3：测试 Webhook

1. **推送测试 commit**：
   ```bash
   cd /Users/chrisl/Documents/恒星UE资产库/web
   git commit --allow-empty -m "test: 验证手动配置的 Deploy Hook webhook"
   git push
   ```

2. **检查 GitHub Webhook 状态**：
   - 访问：https://github.com/chrisliuchaofan/ue-asset-library/settings/hooks
   - 点击 webhook 条目
   - 查看 **"Recent Deliveries"** 标签
   - 应该能看到新的 `push` 事件交付
   - 状态应该是 `200` 或 `201`（成功，不再是 404）

3. **检查 Vercel 部署**：
   - 访问 Vercel Dashboard → Deployments
   - 应该能看到新的部署开始（通常在 1-2 分钟内）
   - 部署状态会显示 "Building" 然后变为 "Ready"

## 🔍 为什么 Vercel 没有自动创建 Webhook？

### 可能的原因：

1. **GitHub 权限不足**：
   - Vercel 的 GitHub OAuth App 可能没有创建 webhook 的权限
   - 需要检查 GitHub 授权设置

2. **Vercel 的自动创建机制限制**：
   - 某些情况下，Vercel 不会自动创建 webhook
   - 特别是如果之前手动配置过 webhook

3. **项目配置问题**：
   - 项目设置可能禁用了自动 webhook 创建
   - 需要手动配置

### 检查 GitHub 权限：

1. **在 GitHub**：
   - Settings → Applications → Authorized OAuth Apps
   - 找到 Vercel
   - 检查权限是否包括：
     - ✅ Repository access
     - ✅ Webhook permissions
     - ✅ Write access to webhooks

2. **如果权限不足**：
   - 点击 Vercel 应用
   - 查看权限列表
   - 如果缺少 webhook 权限，需要重新授权：
     - 在 Vercel Dashboard → Settings → Git
     - 断开连接
     - 重新连接时，GitHub 会提示授权
     - 确保授予所有权限

## 📋 验证清单

完成配置后，确认：

- [ ] Vercel Deploy Hook 已创建
- [ ] Deploy Hook URL 已复制
- [ ] GitHub Webhook 已更新或创建（使用新的 Deploy Hook URL）
- [ ] Webhook 状态是 "Active"（绿色）
- [ ] GitHub Webhook Recent Deliveries 显示 ping 事件（状态 200）
- [ ] 推送测试 commit 后，push 事件交付状态是 200（不再是 404）
- [ ] Vercel Dashboard 显示新的部署开始

## ⚡ 快速操作命令

```bash
# 测试 webhook
cd /Users/chrisl/Documents/恒星UE资产库/web
git commit --allow-empty -m "test: 验证 Deploy Hook webhook"
git push

# 然后检查：
# 1. GitHub: https://github.com/chrisliuchaofan/ue-asset-library/settings/hooks
#    → 点击 webhook → Recent Deliveries → 应该看到成功的 push 事件
# 2. Vercel: https://vercel.com/dashboard → Deployments → 应该看到新部署
```

## 🎯 为什么手动创建 Deploy Hook 更可靠？

1. **完全控制**：你可以看到每一步，知道发生了什么
2. **不依赖权限**：不需要 Vercel 有创建 webhook 的权限
3. **更透明**：可以清楚地看到 webhook URL 和配置
4. **易于调试**：如果出现问题，更容易定位和修复

## 📝 注意事项

- **Deploy Hook URL 只显示一次**：创建后立即复制，如果丢失需要删除重新创建
- **一个 Deploy Hook 可以用于多个 webhook**：如果需要，可以在多个 GitHub 仓库中使用同一个 hook
- **Deploy Hook 不会过期**：除非手动删除，否则一直有效
- **Deploy Hook 不需要 secret**：GitHub webhook 配置中 secret 留空即可

## 🆘 如果仍然失败

如果按照上述步骤操作后仍然失败：

1. **检查 Deploy Hook 是否有效**：
   - 在 Vercel Dashboard → Settings → Git → Deploy Hooks
   - 确认 hook 仍然存在
   - 可以点击 hook 右侧的 "..." 菜单 → "Test Hook" 测试

2. **手动测试 Deploy Hook**：
   ```bash
   # 使用 curl 测试 Deploy Hook URL
   curl -X POST "YOUR_DEPLOY_HOOK_URL"
   ```
   - 如果返回成功，说明 hook 有效
   - 然后检查 Vercel Dashboard 是否开始部署

3. **检查 Vercel 项目设置**：
   - Settings → Git
   - 确认 "Production Branch" 是 `main`
   - 确认 "Auto-deploy" 已启用

4. **联系 Vercel 支持**：
   - 如果所有方法都试过了仍然不行，可能需要联系 Vercel 支持

