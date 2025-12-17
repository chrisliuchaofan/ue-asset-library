# Vercel 自动部署问题系统排查

## 🔍 问题确认

**当前状态：**
- ✅ GitHub Webhook 的 Push 事件交付成功（绿色对勾）
- ✅ GitHub 已经把消息发送给 Vercel
- ❌ Vercel 项目 6 小时前有成功构建，但之后的新提交没触发新 deployment
- ✅ 本地构建成功（已验证 `npm run build` 无错误）

**结论：** 问题在 Vercel 端"接到了但没启动构建"，或配置规则导致跳过。

---

## 📋 系统排查步骤（按顺序执行，不要跳步）

### A. 检查最容易踩的 5 个开关

#### 1. **Project → Git → Auto-Deployments**

**检查位置：**
- Vercel Dashboard → 项目 `ue-asset-library` → Settings → Git
- 找到 **"Auto-Deployments"** 部分

**需要确认：**
- ✅ **Production** 必须是 **On**
- ✅ **Preview** 建议也是 **On**（如果不需要预览可以关）

**如果关闭了：**
- 点击开关打开
- 保存后推送测试 commit

---

#### 2. **Production Branch**

**检查位置：**
- Vercel Dashboard → Settings → Git
- 找到 **"Production Branch"** 设置

**需要确认：**
- ✅ 必须是 `main`（或你正在推送的分支）
- ❌ 如果设置成其他分支（如 `master`、`develop`），Vercel 不会响应 `main` 的推送

**如果不对：**
- 修改为 `main`
- 保存后推送测试 commit

---

#### 3. **Ignored Build Step（跳过构建脚本）**

**检查位置：**
- Vercel Dashboard → Settings → Build & Development Settings
- 找到 **"Ignored Build Step"** 字段

**需要确认：**
- ✅ 如果为空，说明没有跳过规则（正常）
- ⚠️ 如果有脚本，检查逻辑是否正确

**常见错误脚本示例（会导致所有提交被跳过）：**
```bash
# ❌ 错误：逻辑写反了，所有提交都会被跳过
git diff --name-only $VERCEL_GIT_PREVIOUS_SHA $VERCEL_GIT_COMMIT_SHA | grep -vE '^(docs|README|\.md)'

# ✅ 正确：只改 docs 才跳过
git diff --name-only $VERCEL_GIT_PREVIOUS_SHA $VERCEL_GIT_COMMIT_SHA | grep -E '^(docs|README|\.md)'
```

**如果怀疑有问题：**
1. **先清空这个字段**，保存
2. 推送测试 commit：`git commit --allow-empty -m "test: 验证 Ignored Build Step"`
3. 观察是否触发部署
4. 如果触发了，说明之前的脚本有问题，重新写正确的逻辑

---

#### 4. **Required Checks / Branch Protection**

**检查位置：**
- GitHub → 仓库 `chrisliuchaofan/ue-asset-library` → Settings → Branches
- 查看 **Branch protection rules**

**需要确认：**
- ✅ 如果 `main` 分支没有保护规则，跳过此步
- ⚠️ 如果有保护规则，检查是否要求某些 CI 检查必须通过

**如果要求检查：**
- 临时关闭保护规则测试
- 或者确保所有要求的检查都通过

---

#### 5. **计划用量/并发队列**

**检查位置：**
- Vercel Dashboard → Deployments 页面
- 右上角 **Status** 筛选器

**需要确认：**
- ✅ 查看是否有 **Queued** 或 **Building** 状态的部署
- ⚠️ Hobby 计划通常只有 1 个并发构建

**如果有卡住的部署：**
1. 点击卡住的部署
2. 点击 **"Cancel"** 取消
3. 等待队列释放
4. 推送测试 commit

---

### B. 用"事件回放"确认 Vercel 是否吃到了钩子

#### 步骤：

1. **在 GitHub Webhooks 页面**：
   - 访问：https://github.com/chrisliuchaofan/ue-asset-library/settings/hooks
   - 点击 webhook 条目
   - 进入 **"Recent Deliveries"** 标签

2. **找到最近一次 push 事件**：
   - 找到事件类型为 `push` 的交付记录
   - 点击进入详情

3. **点击 "Redeliver" 按钮**：
   - 这会重新发送 webhook 请求
   - 观察 Vercel 是否响应

4. **查看 Response**：
   - 点击 **"Response"** 标签
   - 查看状态码和响应内容

**理想情况：**
- 状态码：`200` 或 `201`
- 响应内容包含：`"queued deployment"` 或 `deployment id`

**异常情况：**
- 状态码：`4xx` 或 `5xx`
- 响应内容包含：`"project not found"`、`"repo disconnected"`、`"unauthorized"`

**如果异常：**
- 继续执行步骤 C（强制重连）

---

### C. 强制重连 Vercel ↔ GitHub

#### 步骤：

1. **在 Vercel Dashboard 断开连接**：
   - 项目 `ue-asset-library` → Settings → Git
   - 点击 **"Disconnect"** 按钮
   - 确认断开

2. **在 Vercel 重新安装 GitHub 集成**：
   - Vercel Dashboard 右上角头像 → **Settings** → **Git Integrations**
   - 找到 GitHub 集成
   - 点击 **"Configure"** 或 **"Reinstall"**
   - 选择 **"Only select repositories"**
   - **勾选** `chrisliuchaofan/ue-asset-library`
   - 确认授权

3. **重新连接仓库**：
   - 回到项目 `ue-asset-library` → Settings → Git
   - 点击 **"Connect Git Repository"**
   - 选择 `chrisliuchaofan/ue-asset-library`
   - 选择分支 `main`
   - 确认连接

4. **测试自动部署**：
   ```bash
   cd /Users/chrisl/Documents/恒星UE资产库/web
   git commit --allow-empty -m "test: 验证重连后的自动部署"
   git push
   ```
   - 观察 Vercel Dashboard → Deployments 是否在 1-2 分钟内出现新部署

---

### D. 排除配置本身的问题（手动触发一次）

#### 方法 1：在 Vercel Dashboard 手动触发

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
- 继续执行步骤 E（使用 Deploy Hook）

**如果手动部署失败：**
- 查看构建日志
- 修复构建错误
- 重新推送

---

#### 方法 2：使用 Vercel CLI

```bash
# 安装 Vercel CLI（如果还没有）
npm i -g vercel

# 登录
vercel login

# 在项目目录中
cd /Users/chrisl/Documents/恒星UE资产库/web

# 拉取项目配置
vercel pull --environment=production

# 手动部署到生产环境
vercel deploy --prod
```

**如果 CLI 部署成功：**
- 说明构建配置没问题
- 问题只在"自动触发链路"

---

### E. 兜底方案：改用 Deploy Hook（绕过 App 自动触发）

如果前面的步骤都试过了仍然不工作，使用 Deploy Hook 作为替代方案：

#### 步骤：

1. **在 Vercel 创建 Deploy Hook**：
   - Vercel Dashboard → 项目 → Settings → Git
   - 滚动到 **"Deploy Hooks"** 部分
   - 点击 **"Create Hook"**
   - 填写：
     - **Name**: `github-push-trigger`
     - **Branch**: `main`
   - 点击 **"Create Hook"**
   - **立即复制生成的 URL**（格式：`https://api.vercel.com/v1/deployments/hooks/xxxxx`）

2. **在 GitHub 添加 Webhook**：
   - GitHub → 仓库 → Settings → Webhooks
   - 点击 **"Add webhook"**
   - 填写：
     - **Payload URL**: 粘贴从 Vercel 复制的 Deploy Hook URL
     - **Content type**: `application/json`
     - **Secret**: 留空（Deploy Hook 不需要 secret）
     - **Which events**: 选择 **"Just the push event"**
     - **Active**: ✅ 确保勾选
   - 点击 **"Add webhook"**

3. **测试**：
   ```bash
   cd /Users/chrisl/Documents/恒星UE资产库/web
   git commit --allow-empty -m "test: 验证 Deploy Hook"
   git push
   ```
   - 推送后，Vercel 应该在 1-2 分钟内开始部署

---

## 🎯 三个高概率真实"元凶"

### 1. **Ignored Build Step 脚本写反了**

**症状：**
- 最近提交基本都是 `docs:` 开头的
- 在 Ignored Build Step 里写了"只改 docs 就跳过"的逻辑
- 但脚本条件写反了，导致所有提交都被跳过

**检查方法：**
- 清空 Ignored Build Step 字段
- 推送测试 commit
- 如果触发了，说明之前的脚本有问题

---

### 2. **Auto-Deployments 被手滑关闭**

**症状：**
- 某次在 Vercel Dashboard 手滑点了关闭
- 之后所有推送都不会触发部署

**检查方法：**
- Settings → Git → Auto-Deployments
- 确认 Production 是 **On**

---

### 3. **分支改了但 Vercel 还在盯着旧分支**

**症状：**
- GitHub 默认分支从 `main` 改成了其他分支
- 或者 Vercel 的 Production Branch 设置错误

**检查方法：**
- Settings → Git → Production Branch
- 确认是 `main`（或你正在推送的分支）

---

## ✅ 快速自检清单（两分钟过一遍）

请逐一检查以下项目：

- [ ] **Auto-Deployments = On**（Production 和 Preview）
- [ ] **Production Branch = 你正在 push 的分支**（通常是 `main`）
- [ ] **Ignored Build Step 清空或确认逻辑正确**
- [ ] **GitHub Branch Protection 没有卡检查**
- [ ] **Vercel Deployments 没有卡 Pending 队列**
- [ ] **GitHub Webhook Redeliver 返回 "queued deployment"**（状态 200/201）

---

## 📝 执行顺序

**按照以下顺序执行，不要跳步：**

1. ✅ **A.1** 检查 Auto-Deployments
2. ✅ **A.2** 检查 Production Branch
3. ✅ **A.3** 检查 Ignored Build Step（**最可疑**）
4. ✅ **A.4** 检查 Branch Protection
5. ✅ **A.5** 检查并发队列
6. ✅ **B** 用 Redeliver 确认 Vercel 是否收到钩子
7. ✅ **C** 如果 B 异常，强制重连 Vercel ↔ GitHub
8. ✅ **D** 手动触发一次部署，确认构建配置没问题
9. ✅ **E** 如果前面都不行，使用 Deploy Hook 作为兜底方案

---

## 🔧 如果仍然不工作

如果按照上述步骤操作后仍然不工作，请提供：

1. **GitHub Webhook Delivery 的 Response 截图**（包含状态码和响应内容）
2. **Vercel 项目页 Git 设置截图**（包含 Auto-Deployments、Production Branch、Ignored Build Step）

这些信息可以帮助进一步定位问题。

---

## 📚 参考文档

- [Vercel: Why aren't commits triggering deployments?](https://vercel.com/guides/why-aren-t-commits-triggering-deployments-on-vercel)
- [Vercel: Why are my builds queued?](https://docs.vercel.com/kb/guide/why-are-my-vercel-builds-queued)
- [Vercel: Deploy Hooks](https://vercel.com/docs/deployments/deploy-hooks)







