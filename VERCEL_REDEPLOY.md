# Vercel 重新部署指南

## 问题：Vercel 仍在使用旧提交 (ad0ad25)

如果 Vercel 没有自动检测到新的提交，可以按以下步骤手动触发重新部署。

## 方法 1：在 Vercel 控制台手动重新部署（推荐）

### 步骤：

1. **登录 Vercel**
   - 访问 [vercel.com](https://vercel.com)
   - 登录你的账号

2. **进入项目**
   - 在 Dashboard 中找到 `ue-asset-library` 项目
   - 点击进入项目详情页

3. **查看部署记录**
   - 点击顶部的 **"Deployments"** 标签
   - 查看最新的部署记录

4. **手动触发重新部署**
   - 找到最新的部署（即使它失败了）
   - 点击部署记录右侧的 **"..."** (三个点)
   - 选择 **"Redeploy"**
   - 或者直接点击页面右上角的 **"Redeploy"** 按钮

5. **确认部署**
   - 在弹出窗口中，确认使用最新的 commit
   - 点击 **"Redeploy"** 确认

## 方法 2：通过 Git 推送触发（如果方法 1 不行）

### 步骤：

1. **创建一个空提交触发部署**
   ```bash
   cd "/Users/shenghua/Documents/恒星UE资产库/web"
   git commit --allow-empty -m "trigger: 触发 Vercel 重新部署"
   git push origin main
   ```

2. **等待 Vercel 检测**
   - Vercel 应该会自动检测到新的推送
   - 自动开始新的部署

## 方法 3：检查 Vercel Git 连接

如果以上方法都不行，可能是 Git 连接问题：

1. **检查 Git 连接**
   - 进入项目 → **Settings** → **Git**
   - 确认 GitHub 仓库连接正常
   - 确认分支是 `main`

2. **重新连接（如果需要）**
   - 如果连接有问题，点击 **"Disconnect"**
   - 然后重新连接 GitHub 仓库

## 方法 4：使用 Vercel CLI（高级）

如果你安装了 Vercel CLI：

```bash
# 安装 Vercel CLI（如果还没安装）
npm i -g vercel

# 登录
vercel login

# 在项目目录中部署
cd "/Users/shenghua/Documents/恒星UE资产库/web"
vercel --prod
```

## 验证最新提交

在 Vercel 部署页面，确认：

- **Commit**: 应该是 `e5916c1` 或 `8fb02e7`（不是 `ad0ad25`）
- **Message**: 应该包含 "修复 Next.js 15 构建错误"

## 如果仍然使用旧提交

如果 Vercel 仍然使用 `ad0ad25`，可能的原因：

1. **Git 连接问题**：检查 Settings → Git
2. **分支问题**：确认 Vercel 监听的是 `main` 分支
3. **缓存问题**：尝试清除 Vercel 构建缓存

### 清除构建缓存：

1. 进入项目 → **Settings** → **General**
2. 找到 **"Build Cache"** 部分
3. 点击 **"Clear Build Cache"**
4. 然后重新部署

## 快速检查清单

- [ ] 确认 GitHub 上有最新提交（`e5916c1`）
- [ ] 在 Vercel 中手动触发重新部署
- [ ] 检查部署日志中的 commit hash
- [ ] 确认使用的是 `main` 分支
- [ ] 如果还不行，清除构建缓存后重试

## 需要帮助？

如果以上方法都不行，请提供：
1. Vercel 部署页面显示的 commit hash
2. 部署日志中的错误信息（如果有）
3. Vercel Settings → Git 页面的截图


