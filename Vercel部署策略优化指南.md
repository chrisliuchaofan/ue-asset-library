# Vercel 部署策略优化指南

## 🎯 问题分析

**当前问题：**
- 每次提交都触发部署
- 昨天达到 100 次部署限制
- 需要优化策略，减少不必要的部署

---

## 🚀 优化方案

### 方案 1：使用 Ignored Build Step（最有效）

**目的：** 只改文档、README、配置文件时跳过部署

#### 步骤：

1. **在 Vercel Dashboard**：
   - Settings → Git → Ignored Build Step
   - Behavior 选择 **"Custom"**
   - 在命令框中输入：

```bash
# 只改文档、README、配置文件时跳过部署
git diff --name-only $VERCEL_GIT_PREVIOUS_SHA $VERCEL_GIT_COMMIT_SHA | grep -vE '^(docs|README|\.md|\.txt|\.gitignore|\.editorconfig|scripts/.*\.md|scripts/.*\.sh)$'
```

**这个脚本的逻辑：**
- 检查变更的文件
- 如果**只改了**文档、README、配置文件，返回 0（跳过部署）
- 如果改了代码文件，返回 1（需要部署）

**更严格的版本（只改文档时跳过）：**
```bash
# 如果只改了文档，跳过部署
git diff --name-only $VERCEL_GIT_PREVIOUS_SHA $VERCEL_GIT_COMMIT_SHA | grep -qvE '\.(md|txt)$|^docs/|^README' && exit 1 || exit 0
```

**或者更简单（只改 .md 文件时跳过）：**
```bash
# 如果所有变更都是 .md 文件，跳过部署
git diff --name-only $VERCEL_GIT_PREVIOUS_SHA $VERCEL_GIT_COMMIT_SHA | grep -q '\.md$' && [ $(git diff --name-only $VERCEL_GIT_PREVIOUS_SHA $VERCEL_GIT_COMMIT_SHA | grep -v '\.md$' | wc -l) -eq 0 ] && exit 0 || exit 1
```

**推荐使用这个（最实用）：**
```bash
# 只改文档、README、配置文件时跳过部署
# 如果变更的文件都是文档类，返回 0（跳过），否则返回 1（部署）
CHANGED_FILES=$(git diff --name-only $VERCEL_GIT_PREVIOUS_SHA $VERCEL_GIT_COMMIT_SHA)
ONLY_DOCS=$(echo "$CHANGED_FILES" | grep -vE '\.(ts|tsx|js|jsx|json|css|scss|html|md|txt|sh|yml|yaml)$|^docs/|^README|^\.gitignore|^\.editorconfig' | wc -l)
[ "$ONLY_DOCS" -eq 0 ] && exit 0 || exit 1
```

**最简单的版本（推荐）：**
```bash
# 如果只改了 .md 和 .txt 文件，跳过部署
git diff --name-only $VERCEL_GIT_PREVIOUS_SHA $VERCEL_GIT_COMMIT_SHA | grep -qvE '\.(md|txt)$|^docs/' && exit 1 || exit 0
```

2. **点击 "Save" 保存**

3. **测试**：
   ```bash
   # 只改文档，应该跳过部署
   echo "# 测试" >> README.md
   git add README.md
   git commit -m "docs: 测试 Ignored Build Step"
   git push
   # 检查 Vercel，应该没有新部署
   
   # 改代码文件，应该触发部署
   echo "// test" >> app/page.tsx
   git add app/page.tsx
   git commit -m "test: 测试代码变更"
   git push
   # 检查 Vercel，应该有新部署
   ```

---

### 方案 2：合并多个 commit 再推送

**目的：** 减少推送次数，从而减少部署次数

#### 工作流程：

1. **本地开发时，多次 commit**：
   ```bash
   git commit -m "feat: 添加功能 A"
   git commit -m "fix: 修复 bug B"
   git commit -m "docs: 更新文档"
   ```

2. **准备推送时，合并 commit**：
   ```bash
   # 合并最近 3 个 commit
   git rebase -i HEAD~3
   # 在编辑器中，将后两个 commit 的 "pick" 改为 "squash"
   # 保存后，编辑合并后的 commit 消息
   ```

3. **或者使用更简单的方法**：
   ```bash
   # 推送前，合并所有未推送的 commit
   git reset --soft origin/main
   git commit -m "feat: 多个功能更新"
   git push
   ```

**注意：** 如果已经推送到 GitHub，不要使用 `git reset`，会破坏历史。

---

### 方案 3：使用 Preview 部署（开发阶段）

**目的：** 开发阶段使用 Preview，只有重要版本才部署到 Production

#### 配置：

1. **创建开发分支**：
   ```bash
   git checkout -b develop
   git push -u origin develop
   ```

2. **在 Vercel Dashboard**：
   - Settings → Git → Production Branch = `main`
   - 其他分支会自动创建 Preview 部署

3. **工作流程**：
   - 开发时推送到 `develop` 分支 → 自动创建 Preview 部署
   - 重要版本合并到 `main` → 自动创建 Production 部署

**好处：**
- Preview 部署不计入 Production 部署次数
- 可以测试多个版本
- 只有重要版本才部署到 Production

---

### 方案 4：配置 Git 工作流（推荐组合）

**最佳实践：**

1. **使用 Ignored Build Step**（跳过文档变更）
2. **合并 commit 再推送**（减少推送次数）
3. **使用 Preview 部署**（开发阶段）

#### 具体工作流程：

```bash
# 1. 本地开发，多次 commit
git commit -m "feat: 功能 A"
git commit -m "fix: 修复 B"
git commit -m "docs: 更新文档"

# 2. 推送前检查变更
git diff --name-only origin/main

# 3. 如果只改了文档，直接推送（会被 Ignored Build Step 跳过）
# 如果改了代码，合并 commit 再推送
git rebase -i origin/main
# 或者直接推送（如果 commit 不多）

# 4. 推送
git push
```

---

## 📋 推荐的 Ignored Build Step 配置

**根据你的项目结构，推荐使用这个配置：**

```bash
# 只改文档、README、配置文件时跳过部署
CHANGED=$(git diff --name-only $VERCEL_GIT_PREVIOUS_SHA $VERCEL_GIT_COMMIT_SHA)
# 排除文档类文件
CODE_CHANGES=$(echo "$CHANGED" | grep -vE '\.(md|txt)$|^docs/|^README|^\.gitignore|^\.editorconfig|scripts/.*\.md')
# 如果有代码变更，需要部署；否则跳过
[ -z "$CODE_CHANGES" ] && exit 0 || exit 1
```

**或者更简单的版本：**
```bash
# 如果所有变更都是 .md 文件，跳过部署
git diff --name-only $VERCEL_GIT_PREVIOUS_SHA $VERCEL_GIT_COMMIT_SHA | grep -qv '\.md$' && exit 1 || exit 0
```

---

## 🔧 立即配置

### 步骤 1：配置 Ignored Build Step

1. **Vercel Dashboard → Settings → Git → Ignored Build Step**
2. **Behavior 选择 "Custom"**
3. **粘贴以下命令**：

```bash
# 只改文档时跳过部署
git diff --name-only $VERCEL_GIT_PREVIOUS_SHA $VERCEL_GIT_COMMIT_SHA | grep -qvE '\.(md|txt)$|^docs/|^README' && exit 1 || exit 0
```

4. **点击 "Save"**

### 步骤 2：测试配置

```bash
# 测试 1：只改文档，应该跳过部署
echo "# 测试" >> README.md
git add README.md
git commit -m "docs: 测试 Ignored Build Step"
git push
# 等待 1-2 分钟，检查 Vercel，应该没有新部署

# 测试 2：改代码文件，应该触发部署
echo "// test" >> app/page.tsx
git add app/page.tsx
git commit -m "test: 测试代码变更"
git push
# 等待 1-2 分钟，检查 Vercel，应该有新部署
```

---

## 📊 预期效果

**优化前：**
- 每次提交都部署
- 昨天 100+ 次部署
- 达到限制，无法继续部署

**优化后：**
- 只改文档时跳过部署（节省 30-50%）
- 合并 commit 减少推送（节省 20-30%）
- 使用 Preview 部署（节省 Production 部署次数）
- **预计每天部署次数减少到 20-40 次**

---

## ⚠️ 注意事项

1. **Ignored Build Step 脚本要测试**：
   - 确保逻辑正确
   - 不要误跳过代码变更

2. **合并 commit 要谨慎**：
   - 如果已经推送，不要使用 `git reset`
   - 使用 `git rebase -i` 更安全

3. **Preview 部署也有限制**：
   - 虽然不计入 Production，但也有总部署次数限制
   - 不要过度使用

---

## 🎯 总结

**推荐配置：**
1. ✅ **Ignored Build Step**：只改文档时跳过部署
2. ✅ **合并 commit**：减少推送次数
3. ✅ **使用 Preview**：开发阶段用 Preview，重要版本才 Production

**这样可以将每天部署次数从 100+ 减少到 20-40 次，避免达到限制。**


