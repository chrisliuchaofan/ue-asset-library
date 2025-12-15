# 排查 Webhook 成功但未部署的问题

## 🔍 当前状态

**好消息：**
- ✅ GitHub Webhook 的 Push 事件交付成功（状态 201）
- ✅ Webhook URL: `https://api.vercel.com/v1/integrations/deploy/prj_ayv3orBK8dkkC0ElnbCjOGG4cL7m/1v6tsltD3H`
- ✅ 请求已成功发送到 Vercel

**问题：**
- ❌ Vercel Dashboard → Deployments 没有显示新的部署

## 🎯 可能的原因

1. **Integration URL vs Deploy Hook URL**：
   - 当前使用的是 Integration URL（`/v1/integrations/deploy/...`）
   - 可能需要使用 Deploy Hook URL（`/v1/deployments/hooks/...`）

2. **Vercel 项目设置问题**：
   - Auto-deploy 可能未启用
   - Production Branch 配置可能不正确

3. **部署队列或构建问题**：
   - 部署可能卡在队列中
   - 构建可能失败但没有显示

4. **项目 ID 不匹配**：
   - Webhook URL 中的项目 ID 可能与实际项目不匹配

## 🚀 解决方案

### 步骤 1：检查 Vercel Dashboard 的 Deployments

1. **在 Vercel Dashboard**：
   - 访问：https://vercel.com/dashboard
   - 进入项目 `ue-asset-library`
   - 点击 **"Deployments"** 标签

2. **检查部署列表**：
   - 查看是否有对应 commit `9c28587a` 的部署
   - 检查部署状态：
     - "Building" - 正在构建
     - "Ready" - 已完成
     - "Error" - 构建失败
     - "Canceled" - 已取消
   - 如果没有部署，说明 webhook 没有触发部署

3. **检查部署时间**：
   - 查看最新的部署时间
   - 是否对应刚才推送的时间（00:35:18）

### 步骤 2：检查 Vercel 项目设置

1. **检查 Auto-deploy 设置**：
   - Vercel Dashboard → Settings → Git
   - 确认 **"Auto-deploy"** 已启用
   - 确认 **"Production Branch"** 是 `main`

2. **检查项目 ID**：
   - Settings → General
   - 查看 **Project ID**
   - 对比 webhook URL 中的项目 ID：`prj_ayv3orBK8dkkC0ElnbCjOGG4cL7m`
   - 如果项目 ID 不匹配，说明 webhook 指向了错误的项目

3. **检查项目状态**：
   - Overview 页面
   - 确认项目状态是 "Active"

### 步骤 3：使用 Deploy Hook URL（推荐）

Integration URL 可能不会自动触发部署。建议使用 Deploy Hook URL：

1. **在 Vercel Dashboard 创建 Deploy Hook**：
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
   - 点击 webhook 条目
   - 点击 **"Edit"** 按钮
   - 更新 **"Payload URL"**：
     - 删除旧的 Integration URL
     - 粘贴新的 Deploy Hook URL
   - 点击 **"Update webhook"**

3. **测试**：
   ```bash
   cd /Users/chrisl/Documents/恒星UE资产库/web
   git commit --allow-empty -m "test: 验证 Deploy Hook URL"
   git push
   ```
   - 推送后，检查 Vercel Dashboard → Deployments 是否开始部署

### 步骤 4：检查 Vercel 日志

1. **在 Vercel Dashboard**：
   - 进入项目 → **Logs** 标签
   - 查看最近的日志
   - 查找是否有错误信息

2. **检查构建日志**：
   - 如果有失败的部署，点击查看
   - 查看 **"Build Logs"** 标签
   - 查找错误信息

### 步骤 5：手动触发部署测试

如果自动部署仍然不工作，可以手动触发测试：

1. **在 Vercel Dashboard**：
   - 进入 Deployments 页面
   - 点击右上角 **"Deploy"** 按钮
   - 选择最新的 commit `9c28587a`
   - 点击 **"Deploy"**

2. **观察部署过程**：
   - 部署应该立即开始
   - 查看构建日志
   - 确认部署是否成功

3. **如果手动部署成功**：
   - 说明项目配置正常
   - 问题在于 webhook 没有触发部署
   - 需要使用 Deploy Hook URL（步骤 3）

## 📋 详细检查清单

### 检查 Webhook 配置：

- [ ] GitHub Webhook 的 Push 事件交付状态是 201（成功）
- [ ] Webhook URL 是 Deploy Hook URL（`/v1/deployments/hooks/...`）而不是 Integration URL（`/v1/integrations/deploy/...`）
- [ ] Webhook 事件选择是 "Just the push event"

### 检查 Vercel 项目设置：

- [ ] Vercel Dashboard → Settings → Git → Auto-deploy 已启用
- [ ] Production Branch 是 `main`
- [ ] 项目状态是 "Active"
- [ ] Project ID 与 webhook URL 中的项目 ID 匹配

### 检查部署状态：

- [ ] Vercel Dashboard → Deployments 显示最新的部署
- [ ] 部署对应最新的 commit
- [ ] 部署状态是 "Building" 或 "Ready"（不是 "Error"）

## 🔧 常见问题

### 问题 1：Webhook 成功但 Vercel 没有部署

**原因**：
- 使用了 Integration URL 而不是 Deploy Hook URL
- Integration URL 可能不会自动触发部署

**解决方案**：
- 使用 Deploy Hook URL（步骤 3）

### 问题 2：项目 ID 不匹配

**原因**：
- Webhook URL 中的项目 ID 与 Vercel 项目不匹配
- 可能指向了错误的项目

**解决方案**：
1. 检查 Vercel 项目的实际 Project ID
2. 更新 webhook URL 使用正确的项目 ID
3. 或使用 Deploy Hook URL（自动使用正确的项目）

### 问题 3：Auto-deploy 未启用

**原因**：
- Vercel 项目设置中 Auto-deploy 被禁用

**解决方案**：
1. Vercel Dashboard → Settings → Git
2. 启用 "Auto-deploy"
3. 确认 "Production Branch" 是 `main`

## ⚡ 立即操作

**推荐操作（按优先级）：**

1. **检查 Vercel Dashboard → Deployments**：
   - 确认是否有对应 commit `9c28587a` 的部署
   - 如果有，查看状态是什么

2. **使用 Deploy Hook URL**（如果步骤 1 没有部署）：
   - 在 Vercel 创建 Deploy Hook
   - 更新 GitHub webhook URL
   - 推送测试 commit 验证

3. **检查 Vercel 项目设置**：
   - 确认 Auto-deploy 已启用
   - 确认 Production Branch 是 `main`

4. **手动触发部署测试**：
   - 如果自动部署仍然不工作，手动触发一次
   - 确认项目配置正常

## 🎯 关键点

- **Integration URL vs Deploy Hook URL**：
  - Integration URL（`/v1/integrations/deploy/...`）可能不会自动触发部署
  - Deploy Hook URL（`/v1/deployments/hooks/...`）专门用于触发部署
  - 推荐使用 Deploy Hook URL

- **Webhook 成功不等于部署成功**：
  - Webhook 返回 201 只表示请求成功发送
  - 但 Vercel 可能因为配置问题没有开始部署

## 📝 验证步骤

完成修复后，执行以下验证：

```bash
# 1. 推送测试 commit
cd /Users/chrisl/Documents/恒星UE资产库/web
git commit --allow-empty -m "test: 验证自动部署"
git push

# 2. 立即检查（在浏览器中）：
# - GitHub: https://github.com/chrisliuchaofan/ue-asset-library/settings/hooks
#   → Recent Deliveries → 应该看到 push 事件（状态 201）
# - Vercel: https://vercel.com/dashboard → Deployments
#   → 应该在 1-2 分钟内看到新部署开始
```


