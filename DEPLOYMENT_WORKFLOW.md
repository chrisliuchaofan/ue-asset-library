# 部署工作流程 - 如何实时同步修改到线上

## 自动部署流程（推荐）

### 前提条件

1. ✅ **GitHub 仓库已连接**
   - 代码已推送到：`https://github.com/chrisliuchaofan/ue-asset-library.git`
   
2. ✅ **Vercel 已连接 GitHub**
   - 在 Vercel Dashboard 中，项目已连接到 GitHub 仓库
   - 设置路径：项目 → Settings → Git

### 自动同步流程

每次你修改代码并推送后，Vercel 会自动：

1. **检测到新的 Git 提交**
   - Vercel 会监控 GitHub 仓库的 `main` 分支
   - 当检测到新的 `git push` 时，自动触发部署

2. **自动构建和部署**
   - Vercel 会自动运行 `npm run build`
   - 构建成功后自动部署到生产环境
   - 通常需要 1-3 分钟

3. **更新线上网站**
   - 部署完成后，你的修改就会在线上生效
   - 无需手动操作

### 标准工作流程

```bash
# 1. 修改代码
# ... 在本地修改代码 ...

# 2. 提交并推送
cd "/Users/shenghua/Documents/恒星UE资产库/web"
git add -A
git commit -m "你的修改说明"
git push

# 3. 等待 Vercel 自动部署（1-3分钟）
# 4. 访问线上网站，查看更新
```

## 如何确认 Vercel 已连接 GitHub

### 检查步骤

1. **登录 Vercel Dashboard**
   - 访问：https://vercel.com
   - 登录你的账号

2. **进入项目设置**
   - 找到 `ue-asset-library` 项目
   - 点击进入项目详情

3. **检查 Git 连接**
   - 点击 **Settings** → **Git**
   - 确认显示：
     - **Repository**: `chrisliuchaofan/ue-asset-library`
     - **Production Branch**: `main`
     - **Status**: Connected ✅

4. **检查自动部署**
   - 点击 **Settings** → **Git**
   - 确认 **"Automatic deployments from Git"** 已启用

## 验证自动部署是否工作

### 方法 1：查看部署历史

1. 在 Vercel Dashboard 中，点击 **Deployments** 标签
2. 查看最新的部署记录
3. 确认：
   - **Commit**: 应该是最新的提交 hash
   - **Status**: 应该是 "Ready"（绿色）
   - **Source**: 应该显示 "GitHub"

### 方法 2：测试推送

1. 做一个小的修改（比如添加一个注释）
2. 提交并推送：
   ```bash
   git add -A
   git commit -m "test: 测试自动部署"
   git push
   ```
3. 在 Vercel Dashboard 中观察：
   - 应该会在 1-2 分钟内出现新的部署
   - 部署完成后，线上网站会更新

## 如果自动部署不工作

### 问题 1：Vercel 没有检测到新提交

**解决方案：**
1. 检查 Git 连接是否正常
2. 手动触发重新部署：
   - Vercel Dashboard → Deployments
   - 点击最新部署右侧的 "..." → "Redeploy"

### 问题 2：部署失败

**解决方案：**
1. 查看部署日志：
   - Vercel Dashboard → Deployments
   - 点击失败的部署，查看日志
2. 检查常见问题：
   - 环境变量是否配置完整
   - 构建命令是否正确
   - 依赖是否安装成功

### 问题 3：部署成功但网站未更新

**解决方案：**
1. 清除浏览器缓存
2. 硬刷新页面（Ctrl+Shift+R 或 Cmd+Shift+R）
3. 检查是否是静态页面缓存问题

## 快速检查清单

每次推送后，确认：

- [ ] 代码已推送到 GitHub（`git push` 成功）
- [ ] Vercel Dashboard 显示新的部署正在构建
- [ ] 部署状态为 "Ready"（绿色）
- [ ] 线上网站已更新（清除缓存后刷新）

## 总结

**是的，你的修改可以实时同步到线上！**

只要：
1. ✅ 代码推送到 GitHub
2. ✅ Vercel 已连接 GitHub 仓库
3. ✅ 自动部署已启用

那么每次 `git push` 后，Vercel 会自动部署，你的修改会在 1-3 分钟内上线。

**无需手动操作，完全自动化！** 🚀

