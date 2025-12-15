# Git 提交约束方案 - 在提交端控制

## 🎯 目标

**在 Git 提交端做限制，而不是在 Vercel 端过滤：**
- 避免频繁的小提交
- 合并多个相关改动再推送
- 只改文档时不推送（或合并到其他提交）

---

## 🚀 方案 1：使用 Git Hooks 阻止频繁提交（推荐）

### 创建 pre-push Hook

**目的：** 在推送前检查，如果提交太频繁或只改文档，给出警告或阻止。

1. **创建 pre-push hook**：

```bash
# 创建 hook 文件
cat > .git/hooks/pre-push << 'EOF'
#!/bin/bash

# 检查最近 1 小时内的提交次数
RECENT_COMMITS=$(git log --since="1 hour ago" --oneline | wc -l)

if [ "$RECENT_COMMITS" -gt 5 ]; then
  echo "⚠️  警告：最近 1 小时内已有 $RECENT_COMMITS 个提交"
  echo "💡 建议：合并多个提交后再推送，避免触发过多部署"
  read -p "是否继续推送? (y/n) " -n 1 -r
  echo ""
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ 已取消推送"
    exit 1
  fi
fi

# 检查本次推送的提交是否只改文档
CHANGED_FILES=$(git diff --name-only origin/main..HEAD 2>/dev/null || git diff --name-only HEAD~1..HEAD)
ONLY_DOCS=$(echo "$CHANGED_FILES" | grep -vE '\.(md|txt)$|^docs/|^README|^\.gitignore|^\.editorconfig' | wc -l)

if [ "$ONLY_DOCS" -eq 0 ] && [ -n "$CHANGED_FILES" ]; then
  echo "⚠️  警告：本次推送只包含文档变更"
  echo "💡 建议：只改文档时，可以合并到其他提交或稍后推送"
  read -p "是否继续推送? (y/n) " -n 1 -r
  echo ""
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ 已取消推送"
    exit 1
  fi
fi

exit 0
EOF

# 添加执行权限
chmod +x .git/hooks/pre-push
```

2. **测试**：
   ```bash
   # 尝试推送，应该会检查并提示
   git push
   ```

---

## 🚀 方案 2：使用 Git Aliases 合并提交

### 创建便捷命令

**目的：** 提供简单的命令来合并多个提交。

1. **配置 Git alias**：

```bash
# 合并最近 N 个未推送的 commit
git config --global alias.squash '!f() { git reset --soft HEAD~${1:-1} && git commit --edit -m "$(git log --format=%B --reverse HEAD..HEAD@{1})"; }; f'

# 查看未推送的 commit
git config --global alias.unpushed 'log origin/main..HEAD --oneline'

# 交互式合并未推送的 commit
git config --global alias.squash-interactive '!git rebase -i origin/main'
```

2. **使用方法**：

```bash
# 查看未推送的 commit
git unpushed

# 合并最近 3 个 commit
git squash 3

# 交互式合并（推荐）
git squash-interactive
```

---

## 🚀 方案 3：工作流程规范

### 推荐的工作流程

**原则：** 本地可以频繁 commit，但推送前要合并。

#### 步骤：

1. **本地开发，频繁 commit**：
   ```bash
   git commit -m "feat: 添加功能 A"
   git commit -m "fix: 修复 bug B"
   git commit -m "docs: 更新文档"
   ```

2. **推送前，合并 commit**：
   ```bash
   # 方法 1：交互式合并（推荐）
   git rebase -i origin/main
   # 在编辑器中，将后两个 commit 的 "pick" 改为 "squash"
   
   # 方法 2：简单合并（如果 commit 不多）
   git reset --soft origin/main
   git commit -m "feat: 多个功能更新"
   ```

3. **推送**：
   ```bash
   git push
   ```

---

## 🚀 方案 4：创建提交脚本（最实用）

### 创建智能提交脚本

**目的：** 自动检测变更类型，决定是否立即推送。

1. **创建脚本**：

```bash
cat > scripts/smart-commit.sh << 'EOF'
#!/bin/bash

# 智能提交脚本
# 用法: ./scripts/smart-commit.sh "提交信息" [--push]

COMMIT_MSG="$1"
PUSH_FLAG="$2"

if [ -z "$COMMIT_MSG" ]; then
  echo "❌ 错误：请提供提交信息"
  echo "用法: ./scripts/smart-commit.sh '提交信息' [--push]"
  exit 1
fi

# 检查变更的文件
CHANGED_FILES=$(git diff --cached --name-only)
if [ -z "$CHANGED_FILES" ]; then
  CHANGED_FILES=$(git diff --name-only HEAD~1..HEAD 2>/dev/null || echo "")
fi

# 判断是否只改文档
ONLY_DOCS=$(echo "$CHANGED_FILES" | grep -vE '\.(md|txt)$|^docs/|^README|^\.gitignore|^\.editorconfig' | wc -l)

# 提交
git commit -m "$COMMIT_MSG"

if [ "$PUSH_FLAG" = "--push" ]; then
  if [ "$ONLY_DOCS" -eq 0 ] && [ -n "$CHANGED_FILES" ]; then
    echo "⚠️  警告：本次提交只包含文档变更"
    read -p "是否继续推送? (y/n) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
      echo "💡 提示：可以使用 'git push' 稍后推送"
      exit 0
    fi
  fi
  
  # 检查最近提交频率
  RECENT_COMMITS=$(git log --since="1 hour ago" --oneline | wc -l)
  if [ "$RECENT_COMMITS" -gt 5 ]; then
    echo "⚠️  警告：最近 1 小时内已有 $RECENT_COMMITS 个提交"
    echo "💡 建议：合并多个提交后再推送"
    read -p "是否继续推送? (y/n) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
      echo "💡 提示：可以使用 'git push' 稍后推送"
      exit 0
    fi
  fi
  
  git push
else
  echo "💡 提示：使用 'git push' 推送，或使用 './scripts/smart-commit.sh \"$COMMIT_MSG\" --push' 立即推送"
fi
EOF

chmod +x scripts/smart-commit.sh
```

2. **使用方法**：

```bash
# 只提交，不推送
./scripts/smart-commit.sh "feat: 添加新功能"

# 提交并推送（会检查并提示）
./scripts/smart-commit.sh "feat: 添加新功能" --push
```

---

## 🚀 方案 5：修改 pre-push.sh 添加检查

### 增强现有的 pre-push 脚本

**目的：** 在现有的 pre-push.sh 中添加提交频率检查。

修改 `scripts/pre-push.sh`：

```bash
#!/bin/bash

# 自动测试脚本 - 在推送前运行
set -e

echo "🔍 开始自动测试..."

# 新增：检查提交频率
RECENT_COMMITS=$(git log --since="1 hour ago" --oneline | wc -l)
if [ "$RECENT_COMMITS" -gt 5 ]; then
  echo "⚠️  警告：最近 1 小时内已有 $RECENT_COMMITS 个提交"
  echo "💡 建议：合并多个提交后再推送，避免触发过多部署"
  read -p "是否继续推送? (y/n) " -n 1 -r
  echo ""
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ 已取消"
    exit 1
  fi
fi

# 新增：检查是否只改文档
CHANGED_FILES=$(git diff --name-only origin/main..HEAD 2>/dev/null || git diff --name-only HEAD~1..HEAD)
ONLY_DOCS=$(echo "$CHANGED_FILES" | grep -vE '\.(md|txt)$|^docs/|^README|^\.gitignore|^\.editorconfig' | wc -l)

if [ "$ONLY_DOCS" -eq 0 ] && [ -n "$CHANGED_FILES" ]; then
  echo "⚠️  警告：本次推送只包含文档变更"
  echo "💡 建议：只改文档时，可以合并到其他提交或稍后推送"
  read -p "是否继续推送? (y/n) " -n 1 -r
  echo ""
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ 已取消"
    exit 1
  fi
fi

# 原有的测试逻辑
if [ -n "$(git status --porcelain)" ]; then
  echo "⚠️  检测到未提交的更改"
  git status --short
  echo ""
  read -p "是否继续测试并提交? (y/n) " -n 1 -r
  echo ""
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ 已取消"
    exit 1
  fi
fi

echo "📦 运行构建测试..."
if npm run build; then
  echo "✅ 构建测试通过"
else
  echo "❌ 构建测试失败，请修复错误后再推送"
  exit 1
fi

echo ""
echo "✅ 所有测试通过！可以安全推送了"
```

---

## 📋 推荐方案组合

**最佳实践：**

1. ✅ **增强 pre-push.sh**（方案 5）
   - 在推送前检查提交频率
   - 检查是否只改文档
   - 给出警告和建议

2. ✅ **使用 Git aliases**（方案 2）
   - 提供便捷的合并命令
   - `git squash-interactive` 交互式合并

3. ✅ **工作流程规范**（方案 3）
   - 本地频繁 commit
   - 推送前合并

---

## ⚡ 立即实施

**推荐先实施方案 5（增强 pre-push.sh）：**

1. 修改 `scripts/pre-push.sh`，添加提交频率和文档检查
2. 测试推送，应该会看到警告提示
3. 根据提示决定是否继续推送

这样可以在提交端控制，避免频繁部署。


