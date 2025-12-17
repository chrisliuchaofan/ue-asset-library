# 排查 Integration URL 问题 - 根本原因

## 🔍 问题确认

**当前情况：**
- ✅ GitHub Webhook Push 事件交付成功（状态 201）
- ✅ Integration URL 返回了 `job.state = PENDING`
- ❌ 但 Vercel Deployments 没有显示新部署
- ⚠️ Deploy Hooks 复制出来的也是 Integration URL（不是 `/v1/deployments/hooks/...`）

**这说明：**
- Vercel 确实收到了 webhook 请求
- Vercel 创建了 job，但 job 一直 PENDING
- Job 没有转换为实际的 deployment

---

## 🎯 根本原因分析

Integration URL 返回 `job.state = PENDING` 但部署没有创建，可能的原因：

### 1. **Job 在队列中卡住（最可能）**

Hobby 计划只有 1 个并发构建。如果：
- 有其他构建在运行
- 有卡住的构建
- 队列满了

新的 job 会一直 PENDING，不会创建 deployment。

### 2. **Vercel 无法访问 GitHub 仓库**

虽然 webhook 成功了，但 Vercel 在尝试拉取代码时可能失败：
- Git 集成权限不足
- 仓库访问权限被撤销
- 仓库名称拼写错误（`chrislluchaofan` vs `chrisliuchaofan`）

### 3. **项目配置阻止了部署**

某些项目级别的配置可能阻止部署：
- 虽然我们没看到 Auto-Deployments 开关，但可能有其他限制
- 部署保护规则
- 环境变量缺失导致构建失败

---

## 🚀 排查步骤（按优先级）

### 步骤 1：检查部署队列和卡住的构建

**这是最可能的原因！**

1. **在 Vercel Dashboard**：
   - 进入 **Deployments** 页面
   - 点击右上角的 **Status** 筛选器
   - **确保选择了所有状态**（包括 Queued、Building、Error）

2. **查找卡住的部署**：
   - 查看是否有长时间处于以下状态的部署：
     - **Queued**（排队中）
     - **Building**（构建中，但超过 10 分钟）
     - **Error**（失败）

3. **如果有卡住的部署**：
   - 点击进入详情
   - 查看构建日志
   - 如果确认卡住，点击 **"Cancel"** 取消
   - 等待队列释放

4. **检查团队级别的构建**：
   - 去 Vercel Dashboard 主页（不是项目页）
   - 查看是否有其他项目的构建在运行
   - Hobby 计划只有 1 个并发，如果有其他构建，新构建会排队

---

### 步骤 2：检查 Git 集成权限

1. **在 GitHub**：
   - Settings → Applications → Authorized OAuth Apps
   - 找到 **Vercel**
   - 检查权限是否包括：
     - ✅ Repository access
     - ✅ Webhook permissions

2. **检查仓库访问**：
   - 在 Vercel Dashboard → Settings → Git
   - 确认 Connected Repository 显示的是正确的仓库
   - 注意：截图显示 `chrislluchaofan`，但实际应该是 `chrisliuchaofan`（多了一个 `l`）

3. **如果权限有问题**：
   - 在 Vercel Dashboard → Settings → Git → **Disconnect**
   - 重新连接时，确保授予所有权限

---

### 步骤 3：手动触发部署测试

如果自动触发不工作，手动触发一次，确认构建配置没问题：

1. **在 Vercel Dashboard**：
   - 进入 Deployments 页面
   - 找到最新的 commit（即使没有部署记录）
   - 点击 commit 右侧的 **"..."** 菜单
   - 选择 **"Redeploy"**

2. **观察部署过程**：
   - 部署应该立即开始
   - 查看构建日志
   - 确认部署是否成功

**如果手动部署成功：**
- 说明构建配置没问题
- 问题只在"自动触发链路"
- 继续排查队列和权限问题

**如果手动部署失败：**
- 查看构建日志
- 修复构建错误
- 重新推送

---

### 步骤 4：检查 Vercel 项目设置中的其他限制

1. **检查 Deployment Protection**：
   - Settings → Deployment Protection
   - 查看是否有保护规则阻止部署

2. **检查 Environment Variables**：
   - Settings → Environment Variables
   - 确认所有必需的环境变量都已配置
   - 如果缺失，可能导致构建失败

3. **检查项目状态**：
   - Overview 页面
   - 确认项目状态是 "Active"

---

## 🔧 如果队列和权限都正常，但自动部署仍然不工作

### 方案 1：删除并重新创建 Deploy Hook

1. **删除现有的 Deploy Hook**：
   - Settings → Git → Deploy Hooks
   - 找到 `github-push-trigger`
   - 点击 **"Revoke"** 删除

2. **创建新的 Deploy Hook**：
   - 点击 **"Create Hook"**
   - Name: `github-push-trigger-new`
   - Branch: `main`
   - 点击 **"Create Hook"**
   - **检查生成的 URL 格式**：
     - 如果是 `/v1/deployments/hooks/...`，这是正确的
     - 如果是 `/v1/integrations/deploy/...`，说明 Vercel 的 Deploy Hooks 就是基于 Integration 的

3. **更新 GitHub Webhook**：
   - 使用新的 Deploy Hook URL
   - 更新 GitHub webhook

---

### 方案 2：检查 Vercel 平台状态

1. **访问 Vercel 状态页面**：
   - https://www.vercel-status.com/
   - 查看是否有服务中断或问题

2. **检查 Vercel 社区**：
   - https://community.vercel.com/
   - 查看是否有其他用户报告类似问题

---

## 📋 立即执行的检查清单

请按顺序执行：

- [ ] **Deployments 页面 → Status 筛选器 → 选择所有状态（包括 Queued）**
- [ ] **查看是否有卡住的 Queued/Building 部署**
- [ ] **如果有，取消它们**
- [ ] **检查团队级别是否有其他构建在运行**
- [ ] **GitHub → Settings → Applications → 检查 Vercel 权限**
- [ ] **Vercel → Settings → Git → 确认仓库名称正确（`chrisliuchaofan`，不是 `chrislluchaofan`）**
- [ ] **手动触发一次部署测试**

---

## 🎯 最可能的原因（基于你的情况）

1. **部署队列卡住**（概率 70%）
   - Hobby 计划只有 1 个并发
   - 如果有其他构建在跑或卡住，新构建会一直排队
   - **检查方法：** Deployments 页面 → Status → 选择 Queued

2. **Git 集成权限问题**（概率 20%）
   - Vercel 无法访问 GitHub 仓库
   - **检查方法：** GitHub → Settings → Applications → Vercel

3. **仓库名称拼写错误**（概率 10%）
   - 截图显示 `chrislluchaofan`（多了一个 `l`）
   - **检查方法：** Vercel → Settings → Git → Connected Repository

---

## ⚡ 立即操作

**请先执行以下检查：**

1. **检查部署队列**：
   - Deployments 页面 → Status → 选择 **"Queued"**
   - 告诉我是否有排队的部署

2. **检查 Git 仓库名称**：
   - Settings → Git → Connected Repository
   - 告诉我显示的仓库名称是什么（是 `chrisliuchaofan` 还是 `chrislluchaofan`？）

3. **手动触发一次部署**：
   - Deployments 页面 → 找到最新 commit → "..." → "Redeploy"
   - 告诉我是否成功

把这三个检查的结果告诉我，我们继续定位问题。







