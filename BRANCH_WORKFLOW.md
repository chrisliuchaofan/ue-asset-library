# 双电脑分支开发工作流

本指南适用于在家里和公司两台电脑上分别开发，然后合并的场景。

## 🎯 推荐策略：功能分支工作流

**核心思想**：每开发一个功能或任务，创建一个独立的分支。完成后合并到 `main` 分支。

### 优点
- ✅ 避免冲突：两台电脑开发不同的功能，互不干扰
- ✅ 代码隔离：每个功能独立，便于测试和回滚
- ✅ 易于合并：通过 Pull Request 或直接合并，清晰可控
- ✅ 历史清晰：每个功能的开发历史独立，便于追踪

## 📋 分支命名规范

### 推荐命名格式

```
<类型>/<简短描述>
```

**类型前缀**：
- `feature/` - 新功能（如：`feature/user-authentication`）
- `fix/` - 修复bug（如：`fix/login-error`）
- `refactor/` - 重构代码（如：`refactor/api-structure`）
- `home/` - 家里电脑的临时分支（如：`home/admin-ui`）
- `office/` - 公司电脑的临时分支（如：`office/upload-feature`）

**示例**：
- `feature/asset-search` - 资产搜索功能
- `fix/image-preview-bug` - 修复图片预览bug
- `home/admin-dashboard` - 家里开发的 admin 面板
- `office/batch-upload` - 公司开发的批量上传功能

## 🏠 家里电脑工作流程（当前电脑）

### 场景 1：开始新功能开发

```bash
# 1. 确保在 main 分支，并拉取最新代码
git checkout main
git pull origin main

# 2. 创建新分支（例如：开发搜索功能）
git checkout -b feature/asset-search

# 3. 开始开发...
# ... 编写代码 ...

# 4. 提交更改
git add -A
git commit -m "feat: 添加资产搜索功能"

# 5. 推送到远程（首次推送需要设置上游）
git push -u origin feature/asset-search
```

### 场景 2：继续开发已有分支

```bash
# 1. 查看所有分支（包括远程）
git branch -a

# 2. 切换到你的分支
git checkout feature/asset-search

# 3. 拉取最新代码（如果有其他人也在开发这个分支）
git pull origin feature/asset-search

# 4. 继续开发...
# ... 编写代码 ...

# 5. 提交并推送
git add -A
git commit -m "feat: 完善搜索功能，添加筛选"
git push origin feature/asset-search
```

### 场景 3：功能开发完成，合并到 main

```bash
# 1. 确保所有更改已提交
git status

# 2. 切换到 main 分支
git checkout main

# 3. 拉取最新的 main 分支（可能公司电脑有更新）
git pull origin main

# 4. 合并功能分支
git merge feature/asset-search

# 5. 如果有冲突，解决冲突后：
git add <冲突文件>
git commit -m "merge: 合并 feature/asset-search"

# 6. 推送到远程
git push origin main

# 7. 删除本地分支（可选）
git branch -d feature/asset-search

# 8. 删除远程分支（可选）
git push origin --delete feature/asset-search
```

## 🏢 公司电脑工作流程

### 首次设置

```bash
# 1. 克隆仓库
cd ~/Documents
git clone git@github.com:chrisliuchaofan/ue-asset-library.git
cd ue-asset-library

# 2. 安装依赖
npm install
```

### 开始工作

```bash
# 1. 拉取最新代码
git checkout main
git pull origin main

# 2. 创建新分支（例如：开发批量上传功能）
git checkout -b feature/batch-upload

# 3. 开发并提交...
git add -A
git commit -m "feat: 添加批量上传功能"
git push -u origin feature/batch-upload
```

### 完成工作后

```bash
# 1. 确保所有更改已提交
git status

# 2. 推送到远程
git push origin feature/batch-upload

# 3. 切换到 main 并拉取最新（可能家里有更新）
git checkout main
git pull origin main

# 4. 合并功能分支
git merge feature/batch-upload

# 5. 推送到远程
git push origin main
```

## 🔀 合并策略

### 方法 1：直接合并（推荐，简单快速）

适合：小功能、个人开发、快速迭代

```bash
# 在 main 分支上
git checkout main
git pull origin main
git merge feature/your-feature
git push origin main
```

### 方法 2：使用 Pull Request（推荐，更安全）

适合：重要功能、需要代码审查、团队协作

**步骤**：
1. 在 GitHub 上创建 Pull Request
2. 审查代码差异
3. 合并 PR 到 main 分支

**操作**：
```bash
# 1. 推送功能分支
git push origin feature/your-feature

# 2. 在 GitHub 上：
#    - 访问仓库页面
#    - 点击 "Compare & pull request"
#    - 填写 PR 描述
#    - 点击 "Create pull request"
#    - 审查后点击 "Merge pull request"
```

## ⚠️ 避免冲突的最佳实践

### 1. 工作前先拉取

**每次开始工作前**：
```bash
git checkout main
git pull origin main
```

### 2. 使用独立分支

**不要直接在 main 分支上开发**：
```bash
# ❌ 错误：直接在 main 上开发
git checkout main
# ... 直接修改代码 ...

# ✅ 正确：创建功能分支
git checkout main
git pull origin main
git checkout -b feature/new-feature
# ... 在分支上开发 ...
```

### 3. 及时推送

**完成一个功能点就推送**：
```bash
git add -A
git commit -m "feat: 完成搜索框UI"
git push origin feature/asset-search
```

### 4. 小步提交

**频繁提交，每次提交一个小的改动**：
```bash
# ✅ 好：小步提交
git commit -m "feat: 添加搜索输入框"
git commit -m "feat: 添加搜索按钮"
git commit -m "feat: 实现搜索逻辑"

# ❌ 不好：一次提交所有改动
git commit -m "feat: 完成整个搜索功能"
```

## 🔍 查看和管理分支

### 查看所有分支

```bash
# 查看本地分支
git branch

# 查看所有分支（包括远程）
git branch -a

# 查看远程分支
git branch -r
```

### 切换分支

```bash
# 切换到 main 分支
git checkout main

# 切换到功能分支
git checkout feature/asset-search

# 创建并切换新分支
git checkout -b feature/new-feature
```

### 删除分支

```bash
# 删除本地分支（已合并）
git branch -d feature/old-feature

# 强制删除本地分支（未合并）
git branch -D feature/old-feature

# 删除远程分支
git push origin --delete feature/old-feature
```

## 📊 工作流示例

### 示例 1：家里开发搜索功能，公司开发上传功能

**家里电脑**：
```bash
# 周一早上
git checkout main
git pull origin main
git checkout -b feature/asset-search
# ... 开发搜索功能 ...
git commit -m "feat: 添加搜索功能"
git push origin feature/asset-search

# 周二继续
git checkout feature/asset-search
git pull origin feature/asset-search
# ... 继续开发 ...
git commit -m "feat: 添加搜索筛选"
git push origin feature/asset-search

# 周三完成
git checkout main
git pull origin main  # 可能公司有更新
git merge feature/asset-search
git push origin main
```

**公司电脑**：
```bash
# 周一早上
git checkout main
git pull origin main  # 可能家里有更新
git checkout -b feature/batch-upload
# ... 开发上传功能 ...
git commit -m "feat: 添加批量上传"
git push origin feature/batch-upload

# 周二完成
git checkout main
git pull origin main
git merge feature/batch-upload
git push origin main
```

### 示例 2：两台电脑开发不同功能，互不干扰

**家里**：`feature/admin-panel`  
**公司**：`feature/user-profile`

两个分支互不干扰，可以同时开发，最后分别合并到 main。

## 🆘 处理冲突

### 如果合并时出现冲突

```bash
# 1. 合并时出现冲突
git merge feature/asset-search
# Auto-merging app/page.tsx
# CONFLICT (content): Merge conflict in app/page.tsx

# 2. 查看冲突文件
git status

# 3. 打开冲突文件，解决冲突标记
# <<<<<<< HEAD
# 家里的代码
# =======
# 公司的代码
# >>>>>>> feature/asset-search

# 4. 解决冲突后
git add app/page.tsx
git commit -m "merge: 解决冲突，合并 feature/asset-search"

# 5. 推送
git push origin main
```

### 预防冲突

1. **沟通协调**：两台电脑开发不同的功能模块
2. **及时同步**：经常拉取 main 分支的最新代码
3. **小步合并**：功能完成后立即合并，不要积累太多改动

## 📝 提交信息规范

### 推荐格式

```
<类型>: <简短描述>

<详细说明（可选）>
```

**类型**：
- `feat`: 新功能
- `fix`: 修复bug
- `refactor`: 重构
- `docs`: 文档
- `style`: 格式（不影响代码）
- `test`: 测试
- `chore`: 构建/工具

**示例**：
```bash
git commit -m "feat: 添加资产搜索功能"
git commit -m "fix: 修复图片预览加载失败的问题"
git commit -m "refactor: 重构 API 路由结构"
```

## ✅ 快速检查清单

### 开始工作前
- [ ] `git checkout main`
- [ ] `git pull origin main`
- [ ] `git checkout -b feature/your-feature`

### 完成工作后
- [ ] `git status` - 确认所有更改已提交
- [ ] `git push origin feature/your-feature`
- [ ] 合并到 main（如果需要）

### 切换电脑前
- [ ] 所有更改已提交并推送
- [ ] 在另一台电脑上拉取最新代码

## 🎯 推荐工作流程总结

1. **创建功能分支**：每开发一个功能创建一个分支
2. **独立开发**：两台电脑在不同分支上开发
3. **及时推送**：完成功能点就推送
4. **合并到 main**：功能完成后合并到 main
5. **保持同步**：工作前拉取 main 的最新代码

---

**记住**：
- 🏠 家里电脑：创建 `feature/xxx` 或 `home/xxx` 分支
- 🏢 公司电脑：创建 `feature/xxx` 或 `office/xxx` 分支
- 🔀 合并时：先拉取 main，再合并功能分支
- ✅ 推送后：在另一台电脑上拉取更新

这样就能避免冲突，保持代码整洁！✨

