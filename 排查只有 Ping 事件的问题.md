# 排查只有 Ping 事件的问题

## 🔍 问题

手动创建 Deploy Hook 并配置 webhook 后，GitHub Webhooks → Recent Deliveries 中只有 `ping` 事件，没有 `push` 事件。

## 🎯 可能的原因

1. **还没有推送代码**：`ping` 是 webhook 创建时的测试事件，`push` 事件只有在推送代码时才会触发
2. **Webhook 事件配置不正确**：可能没有选择 `push` 事件
3. **Webhook URL 配置错误**：可能使用了错误的 URL

## 🚀 解决方案

### 步骤 1：检查 Webhook 事件配置

1. **在 GitHub Webhooks 页面**：
   - 访问：https://github.com/chrisliuchaofan/ue-asset-library/settings/hooks
   - 点击 webhook 条目（不是 Recent Deliveries）
   - 查看 **"Settings"** 标签（不是 Recent Deliveries）

2. **检查事件配置**：
   - 找到 **"Which events would you like to trigger this webhook?"** 部分
   - 确认选择了以下之一：
     - ✅ **"Just the push event"**（推荐）
     - ✅ **"Send me everything"**（也可以，但会收到所有事件）
   - ❌ 如果选择的是 "Let me select individual events"，确保勾选了 "Push" 事件

3. **如果事件配置不正确**：
   - 点击 **"Edit"** 按钮
   - 修改事件选择为 **"Just the push event"**
   - 点击 **"Update webhook"**

### 步骤 2：检查 Webhook URL

1. **在 GitHub Webhooks 页面**：
   - 点击 webhook 条目
   - 查看 **"Settings"** 标签
   - 检查 **"Payload URL"**

2. **确认 URL 格式**：
   - 应该是 Deploy Hook URL，格式类似：
     ```
     https://api.vercel.com/v1/deployments/hooks/xxxxxxxxxxxxxxxx
     ```
   - ❌ 不应该是 Integration URL（格式：`https://api.vercel.com/v1/integrations/deploy/...`）
   - ❌ 不应该包含旧的 Deploy Hook ID `f09Dyn0Z08`

3. **如果 URL 不正确**：
   - 点击 **"Edit"** 按钮
   - 更新 **"Payload URL"** 为正确的 Deploy Hook URL
   - 点击 **"Update webhook"**

### 步骤 3：推送代码测试 Push 事件

`ping` 事件是 webhook 创建时的测试事件。要看到 `push` 事件，需要推送代码：

```bash
cd /Users/chrisl/Documents/恒星UE资产库/web
git commit --allow-empty -m "test: 触发 push 事件 webhook"
git push
```

**推送后立即检查：**

1. **GitHub Webhooks → Recent Deliveries**：
   - 应该立即看到一个新的交付记录
   - 事件类型应该是 `push`（不是 `ping`）
   - 状态应该是 `200` 或 `201`（成功）
   - 时间应该对应刚刚推送的时间

2. **如果仍然只有 `ping` 事件**：
   - 说明 webhook 没有收到 push 事件
   - 需要检查事件配置（步骤 1）

### 步骤 4：验证 Deploy Hook URL

1. **在 Vercel Dashboard**：
   - 进入项目 `ue-asset-library`
   - Settings → Git
   - 滚动到 **"Deploy Hooks"** 部分
   - 确认 Deploy Hook 仍然存在
   - 如果看不到 URL，可以：
     - 删除旧的 hook
     - 创建新的 hook
     - 立即复制新的 URL

2. **手动测试 Deploy Hook**：
   ```bash
   # 使用 curl 测试 Deploy Hook URL（替换为你的实际 URL）
   curl -X POST "https://api.vercel.com/v1/deployments/hooks/YOUR_HOOK_ID"
   ```
   - 如果返回成功，说明 hook 有效
   - 然后检查 Vercel Dashboard → Deployments 是否开始部署

## 📋 详细检查清单

### 检查 Webhook 配置：

- [ ] GitHub Webhook 的 "Settings" 标签中，事件选择是 "Just the push event"
- [ ] Payload URL 是正确的 Deploy Hook URL（格式：`https://api.vercel.com/v1/deployments/hooks/xxxxx`）
- [ ] Content type 是 `application/json`
- [ ] Secret 留空（Deploy Hook 不需要 secret）
- [ ] Active 已勾选

### 检查 Deploy Hook：

- [ ] Vercel Dashboard → Settings → Git → Deploy Hooks 中，hook 仍然存在
- [ ] Hook 配置的分支是 `main`
- [ ] Hook 名称清晰（如 `github-push-trigger`）

### 测试 Push 事件：

- [ ] 推送测试 commit 后，GitHub Webhooks → Recent Deliveries 显示 `push` 事件
- [ ] Push 事件交付状态是 `200` 或 `201`（成功）
- [ ] Vercel Dashboard → Deployments 显示新的部署开始

## 🔧 常见问题

### 问题 1：只有 Ping 事件，没有 Push 事件

**原因**：
- 还没有推送代码（`ping` 是创建时的测试事件）
- Webhook 事件配置不正确（没有选择 push 事件）

**解决方案**：
1. 检查 webhook 事件配置（步骤 1）
2. 推送代码测试（步骤 3）

### 问题 2：Push 事件交付失败（404 或其他错误）

**原因**：
- Deploy Hook URL 错误
- Deploy Hook 被删除
- 项目 ID 不匹配

**解决方案**：
1. 检查 Deploy Hook URL（步骤 2）
2. 重新创建 Deploy Hook（步骤 4）
3. 更新 GitHub webhook URL

### 问题 3：Push 事件交付成功，但 Vercel 没有部署

**原因**：
- Vercel 项目设置问题
- 部署队列问题
- 构建失败

**解决方案**：
1. 检查 Vercel Dashboard → Deployments 是否有对应部署
2. 检查 Vercel 项目设置（Auto-deploy 是否启用）
3. 查看构建日志

## ⚡ 立即操作

**请执行以下操作：**

1. **检查 Webhook 事件配置**：
   - 访问：https://github.com/chrisliuchaofan/ue-asset-library/settings/hooks
   - 点击 webhook 条目
   - 查看 "Settings" 标签（不是 Recent Deliveries）
   - 确认事件选择是 "Just the push event"
   - 如果不对，点击 "Edit" 修改

2. **推送测试代码**：
   ```bash
   cd /Users/chrisl/Documents/恒星UE资产库/web
   git commit --allow-empty -m "test: 触发 push 事件"
   git push
   ```

3. **立即检查 Recent Deliveries**：
   - 推送后立即刷新 GitHub Webhooks → Recent Deliveries 页面
   - 应该看到新的 `push` 事件交付
   - 如果仍然只有 `ping`，说明事件配置有问题

## 🎯 关键点

- **`ping` 事件是正常的**：这是 webhook 创建时的测试事件，表示 webhook 配置成功
- **`push` 事件需要推送代码**：只有推送代码到 GitHub 时才会触发 `push` 事件
- **如果推送代码后仍然只有 `ping`**：说明 webhook 事件配置不正确，需要检查并修改

## 📝 验证步骤

完成配置后，执行以下验证：

```bash
# 1. 推送测试 commit
cd /Users/chrisl/Documents/恒星UE资产库/web
git commit --allow-empty -m "test: 验证 push 事件 webhook"
git push

# 2. 立即检查（在浏览器中）：
# - GitHub: https://github.com/chrisliuchaofan/ue-asset-library/settings/hooks
#   → 点击 webhook → Recent Deliveries → 应该看到 push 事件
# - Vercel: https://vercel.com/dashboard → Deployments → 应该看到新部署
```







