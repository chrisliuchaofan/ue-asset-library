# 修复 Webhook 缺失问题

## 🔍 问题确认

**根本原因：**
- ❌ GitHub 仓库 `chrisliuchaofan/ue-asset-library` **没有任何 webhook 配置**
- ❌ Vercel 无法收到代码推送通知
- ❌ 因此自动部署无法触发

**当前状态：**
- ✅ 代码已推送到 GitHub（commit `77bc1e9`）
- ✅ Vercel 项目已连接 Git 仓库（在 Vercel 设置中显示已连接）
- ❌ 但 GitHub 端没有 webhook，所以 Vercel 收不到通知

## 🚀 解决方案：重新连接 Git 仓库

这是最简单且推荐的方法，Vercel 会自动创建 webhook。

### 步骤：

1. **在 Vercel Dashboard**：
   - 进入项目 `ue-asset-library`
   - 进入 **Settings** → **Git**
   - 点击 **"Disconnect"** 按钮
   - 确认断开连接

2. **立即重新连接**：
   - 点击 **"Connect Git Repository"** 按钮
   - 选择 GitHub 账号
   - 选择仓库：`chrisliuchaofan/ue-asset-library`
   - 选择分支：`main`
   - 确认连接

3. **验证 Webhook 创建**：
   - 重新连接后，访问：https://github.com/chrisliuchaofan/ue-asset-library/settings/hooks
   - 应该能看到一个新的 webhook（通常显示为 `vercel.com` 或类似）
   - 状态应该是 "Active"（绿色）

4. **测试自动部署**：
   ```bash
   # 创建一个测试 commit
   git commit --allow-empty -m "test: 验证 webhook 和自动部署"
   git push
   ```
   - 推送后，在 Vercel Dashboard 的 Deployments 页面应该能看到新的部署自动开始
   - 通常 1-2 分钟内会开始构建

## 🔧 如果重新连接后仍然没有 webhook

### 方法 1：检查 GitHub 权限

1. **在 GitHub**：
   - Settings → Applications → Authorized OAuth Apps
   - 查找 Vercel
   - 确认权限包括：
     - ✅ Repository access
     - ✅ Webhook permissions

2. **如果权限不足**：
   - 在 Vercel 重新连接时会提示重新授权
   - 确保授予所有必需的权限

### 方法 2：手动添加 Webhook（不推荐，但可以作为备选）

如果 Vercel 重新连接后仍然没有创建 webhook，可以手动添加：

1. **获取 Vercel Webhook URL**：
   - 在 Vercel Dashboard → Settings → Git
   - 查看是否有 webhook URL 显示
   - 或者联系 Vercel 支持获取

2. **在 GitHub 手动添加**：
   - 访问：https://github.com/chrisliuchaofan/ue-asset-library/settings/hooks
   - 点击 **"Add webhook"**
   - 填写：
     - **Payload URL**: Vercel 提供的 webhook URL
     - **Content type**: `application/json`
     - **Secret**: （如果有）
     - **Events**: 选择 "Just the push event" 或 "Send me everything"
   - 点击 **"Add webhook"**

**注意**：手动添加 webhook 比较复杂，建议优先使用重新连接的方法。

## 📋 验证清单

重新连接后，检查以下内容：

- [ ] Vercel Git 设置显示仓库已连接
- [ ] GitHub Webhooks 页面显示有 Vercel 的 webhook
- [ ] Webhook 状态是 "Active"（绿色）
- [ ] 推送新 commit 后，Vercel 自动开始部署
- [ ] 部署在 1-3 分钟内完成

## ⚡ 快速操作

**立即执行：**

1. 在 Vercel Dashboard → Settings → Git → 点击 "Disconnect"
2. 立即点击 "Connect Git Repository" 重新连接
3. 等待 1-2 分钟
4. 检查 GitHub Webhooks 页面确认 webhook 已创建
5. 推送测试 commit 验证自动部署

## 🔍 为什么会出现这个问题？

可能的原因：
1. **初始连接时权限不足**：GitHub 没有授予创建 webhook 的权限
2. **Webhook 被删除**：可能之前手动删除过
3. **Vercel 连接异常**：连接过程中断，webhook 未创建成功

**解决后：**
- 重新连接会重新创建 webhook
- 后续的代码推送会自动触发 Vercel 部署
- 不再需要手动触发部署







