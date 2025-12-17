# Ignored Build Step 完整配置

## 🔍 当前状态

从你的截图可以看到：
- ✅ Behavior 已设置为 "Custom"
- ⚠️ Command 字段中的命令不完整（被截断）
- ⚠️ 有警告：Production 部署的配置与项目设置不同

---

## 🚀 完整配置步骤

### 步骤 1：输入完整的命令

在 **Command** 字段中，输入以下完整命令：

```bash
git diff --name-only $VERCEL_GIT_PREVIOUS_SHA $VERCEL_GIT_COMMIT_SHA | grep -qvE '\.(md|txt)$|^docs/|^README|^\.gitignore|^\.editorconfig' && exit 1 || exit 0
```

**命令说明：**
- `git diff --name-only`：获取变更的文件列表
- `grep -qvE`：排除文档类文件（`.md`、`.txt`、`docs/`、`README` 等）
- 如果有代码变更 → `exit 1`（需要部署）
- 如果只改文档 → `exit 0`（跳过部署）

---

### 步骤 2：处理警告

**警告信息：**
> "Configuration Settings in the current Production deployment differ from your current Project Settings."

**含义：**
- 当前 Production 部署使用的是旧的配置（可能是 "Automatic"）
- 你刚改成了 "Custom"，所以有差异

**解决方法：**
1. **保存当前配置**（点击 "Save"）
2. **下次部署时会使用新配置**
3. 或者点击 **"Redeploy"** 立即应用新配置（但需要等待 1 小时限制重置）

**注意：** 这个警告不影响功能，只是提示配置有变化。

---

### 步骤 3：保存配置

1. **确认 Command 字段中的命令完整**
2. **点击 "Save" 按钮**
3. **等待保存成功**

---

## 📋 命令选项

### 选项 1：简单版本（推荐）

```bash
git diff --name-only $VERCEL_GIT_PREVIOUS_SHA $VERCEL_GIT_COMMIT_SHA | grep -qvE '\.(md|txt)$|^docs/|^README|^\.gitignore|^\.editorconfig' && exit 1 || exit 0
```

**效果：** 只改文档时跳过部署

---

### 选项 2：更严格版本

```bash
# 只改 .md 和 .txt 文件时跳过部署
CHANGED=$(git diff --name-only $VERCEL_GIT_PREVIOUS_SHA $VERCEL_GIT_COMMIT_SHA)
ONLY_DOCS=$(echo "$CHANGED" | grep -vE '\.(md|txt)$|^docs/|^README' | wc -l)
[ "$ONLY_DOCS" -eq 0 ] && exit 0 || exit 1
```

**效果：** 更严格的检查，确保不会误跳过代码变更

---

### 选项 3：最宽松版本

```bash
# 只改 .md 文件时跳过部署
git diff --name-only $VERCEL_GIT_PREVIOUS_SHA $VERCEL_GIT_COMMIT_SHA | grep -q '\.md$' && [ $(git diff --name-only $VERCEL_GIT_PREVIOUS_SHA $VERCEL_GIT_COMMIT_SHA | grep -v '\.md$' | wc -l) -eq 0 ] && exit 0 || exit 1
```

**效果：** 只有所有变更都是 `.md` 文件时才跳过

---

## ✅ 推荐配置

**使用选项 1（简单版本）：**

```bash
git diff --name-only $VERCEL_GIT_PREVIOUS_SHA $VERCEL_GIT_COMMIT_SHA | grep -qvE '\.(md|txt)$|^docs/|^README|^\.gitignore|^\.editorconfig' && exit 1 || exit 0
```

**这个配置会：**
- ✅ 只改文档时跳过部署
- ✅ 改代码时正常部署
- ✅ 简单易懂，不容易出错

---

## 🧪 测试配置

配置保存后，等待 1 小时限制重置，然后测试：

```bash
# 测试 1：只改文档，应该跳过部署
echo "# 测试" >> README.md
git add README.md
git commit -m "docs: 测试 Ignored Build Step"
git push
# 等待 1-2 分钟，检查 Vercel Deployments，应该没有新部署

# 测试 2：改代码文件，应该触发部署
echo "// test" >> app/page.tsx
git add app/page.tsx
git commit -m "test: 测试代码变更"
git push
# 等待 1-2 分钟，检查 Vercel Deployments，应该有新部署
```

---

## ⚠️ 注意事项

1. **命令必须完整**：
   - 确保 `$VERCEL_GIT_COMMIT_SHA` 完整（不要被截断）
   - 确保命令以 `exit 0` 或 `exit 1` 结尾

2. **警告不影响功能**：
   - Production 部署配置差异的警告是正常的
   - 下次部署时会使用新配置

3. **等待限制重置**：
   - 当前还在 1 小时限制期内
   - 配置保存后，等限制重置再测试

---

## 🎯 立即操作

1. **在 Command 字段中输入完整命令**（选项 1）
2. **点击 "Save" 保存**
3. **等待 1 小时限制重置**
4. **推送测试 commit 验证配置**

配置完成后，只改文档时就不会触发部署了，可以大幅减少部署次数。







