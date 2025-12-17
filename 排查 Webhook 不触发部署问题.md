# 排查 Webhook 不触发部署问题

## 🔍 当前状态

**好消息：**
- ✅ GitHub 仓库已配置 Vercel webhook
- ✅ Webhook URL: `https://api.vercel.com/v1/integrati...`
- ✅ Events: `(push)` 事件已配置
- ✅ Status: "Last delivery was successful"（最后一次交付成功）

**问题：**
- ❌ 但 Vercel 没有自动部署最新代码（commit `77bc1e9`）

## 🚀 可能的原因和解决方案

### 原因 1：Webhook 指向了错误的 Vercel 项目

**检查方法：**

1. **在 GitHub Webhooks 页面**：
   - 点击 webhook 条目
   - 查看完整的 Payload URL
   - 记录完整的 URL

2. **在 Vercel Dashboard**：
   - 进入项目 `ue-asset-library`
   - Settings → General
   - 查看 Project ID
   - 对比 webhook URL 中的 project ID 是否匹配

**解决方案：**
- 如果 project ID 不匹配，需要删除旧 webhook，重新连接 Git 仓库

### 原因 2：Vercel 项目设置问题

**检查方法：**

1. **检查 Production Branch**：
   - Vercel Dashboard → Settings → Git
   - 确认 "Production Branch" 设置为 `main`

2. **检查 Auto-deploy 设置**：
   - Settings → Git
   - 确认 "Auto-deploy" 已启用

3. **检查项目状态**：
   - Overview 页面
   - 确认项目状态是 "Active"

**解决方案：**
- 如果设置不正确，修改后重新推送代码测试

### 原因 3：Webhook 事件配置不完整

**检查方法：**

1. **在 GitHub Webhooks 页面**：
   - 点击 webhook 条目
   - 查看 "Which events would you like to trigger this webhook?"
   - 确认选择了 "Just the push event" 或包含 push 事件

2. **检查 Recent Deliveries**：
   - 点击 webhook → "Recent Deliveries" 标签
   - 查看最近的交付记录
   - 确认：
     - 有新的 push 事件交付
     - 状态是 `200` 或 `201`（成功）
     - 响应内容显示部署已触发

**解决方案：**
- 如果事件配置不正确，编辑 webhook 添加 push 事件
- 如果交付失败，查看错误详情

### 原因 4：Vercel 部署队列或构建失败

**检查方法：**

1. **在 Vercel Dashboard**：
   - 进入 Deployments 页面
   - 查看是否有失败的部署
   - 查看是否有卡住的部署（状态一直是 "Building"）

2. **检查构建日志**：
   - 点击失败的部署
   - 查看 "Build Logs"
   - 查找错误信息

**解决方案：**
- 如果构建失败，修复错误后重新推送
- 如果部署卡住，取消部署后重新推送

## 📋 详细排查步骤

### 步骤 1：验证 Webhook 是否真的在触发

1. **在 GitHub Webhooks 页面**：
   - 点击 webhook 条目
   - 查看 "Recent Deliveries" 标签
   - 查找最近的 push 事件交付（应该对应 commit `77bc1e9`）
   - 检查：
     - ✅ 状态应该是 `200` 或 `201`
     - ✅ 时间应该对应你推送的时间
     - ✅ 响应内容应该显示部署已创建

2. **如果看不到最近的交付**：
   - 说明 webhook 没有收到 push 事件
   - 需要检查 webhook 的事件配置

3. **如果交付失败**：
   - 查看错误详情
   - 可能是 Vercel API 错误或权限问题

### 步骤 2：检查 Vercel 项目配置

1. **确认项目连接**：
   - Vercel Dashboard → Settings → Git
   - 确认仓库显示：`chrisliuchaofan/ue-asset-library`
   - 确认分支显示：`main`

2. **检查部署设置**：
   - Settings → Git
   - 确认 "Production Branch" 是 `main`
   - 确认 "Auto-deploy" 已启用

3. **检查项目 ID**：
   - Settings → General
   - 记录 Project ID
   - 对比 GitHub webhook URL 中的 project ID

### 步骤 3：手动测试 Webhook

1. **在 GitHub Webhooks 页面**：
   - 点击 webhook 条目
   - 点击 "Recent Deliveries" 标签
   - 找到最近的交付
   - 点击 "Redeliver" 按钮（重新发送）
   - 观察 Vercel Dashboard 是否开始新部署

2. **或者推送新的测试 commit**：
   ```bash
   cd /Users/chrisl/Documents/恒星UE资产库/web
   git commit --allow-empty -m "test: 验证 webhook 触发部署"
   git push
   ```
   - 推送后，立即检查：
     - GitHub Webhooks → Recent Deliveries（应该看到新的交付）
     - Vercel Dashboard → Deployments（应该看到新的部署开始）

### 步骤 4：检查 Vercel 部署历史

1. **在 Vercel Dashboard**：
   - 进入 Deployments 页面
   - 查看部署列表
   - 确认：
     - 是否有对应 commit `77bc1e9` 的部署
     - 如果有，状态是什么（Ready / Building / Error）
     - 如果没有，说明 webhook 没有触发部署

2. **如果部署存在但状态异常**：
   - 点击部署查看详情
   - 查看构建日志
   - 查找错误信息

## 🔧 快速修复方案

### 方案 1：重新连接 Git 仓库（推荐）

即使 webhook 存在，重新连接可以确保配置正确：

1. **在 Vercel Dashboard**：
   - Settings → Git
   - 点击 "Disconnect"
   - 立即点击 "Connect Git Repository"
   - 重新选择仓库和分支
   - 确认连接

2. **验证**：
   - 检查 GitHub Webhooks 页面
   - 应该看到 webhook 更新或重新创建
   - 推送测试 commit 验证自动部署

### 方案 2：手动触发部署（临时方案）

如果自动部署仍然不工作，可以手动触发：

1. **在 Vercel Dashboard**：
   - 进入 Deployments 页面
   - 点击右上角 "Deploy" 按钮
   - 选择最新的 commit `77bc1e9`
   - 点击 "Deploy"

2. **或者使用 Vercel CLI**：
   ```bash
   npm i -g vercel
   vercel login
   cd /Users/chrisl/Documents/恒星UE资产库/web
   vercel --prod
   ```

## 📋 验证清单

完成排查后，确认：

- [ ] GitHub Webhook 的 Recent Deliveries 显示最近的 push 事件
- [ ] Webhook 交付状态是 `200` 或 `201`（成功）
- [ ] Vercel Dashboard 显示对应的部署
- [ ] 部署状态是 "Ready" 或 "Building"
- [ ] 如果没有部署，检查 Vercel 项目设置

## ⚡ 立即测试

```bash
# 推送测试 commit
cd /Users/chrisl/Documents/恒星UE资产库/web
git commit --allow-empty -m "test: 验证 webhook 和自动部署"
git push

# 然后立即检查：
# 1. GitHub: https://github.com/chrisliuchaofan/ue-asset-library/settings/hooks
#    → 点击 webhook → Recent Deliveries → 应该看到新的交付
# 2. Vercel: https://vercel.com/dashboard → Deployments → 应该看到新部署开始
```

## 🎯 下一步

根据排查结果：

1. **如果 webhook 交付成功但 Vercel 没有部署**：
   - 检查 Vercel 项目设置
   - 检查部署队列是否有问题

2. **如果 webhook 交付失败**：
   - 查看错误详情
   - 可能需要重新连接 Git 仓库

3. **如果一切正常但部署仍然不自动触发**：
   - 使用手动触发作为临时方案
   - 联系 Vercel 支持







