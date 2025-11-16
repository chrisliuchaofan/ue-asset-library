# 双电脑同步指南

本指南帮助您在家里和公司两台电脑之间保持代码同步。

## 📋 前提条件

1. **Git 已安装**：两台电脑都需要安装 Git
2. **SSH 密钥配置**：两台电脑都需要配置 GitHub SSH 密钥
3. **远程仓库地址**：`git@github.com:chrisliuchaofan/ue-asset-library.git`

## 🚀 首次设置（在第二台电脑上）

### 方法 A：使用 Cursor（推荐 ⭐）

**最简单的方法，全程在 Cursor 中完成：**

1. **打开 Cursor**
2. **克隆仓库**：
   - 按 `Cmd + Shift + P`（macOS）打开命令面板
   - 输入 `Git: Clone` 并选择
   - 输入仓库地址：`git@github.com:chrisliuchaofan/ue-asset-library.git`
   - 选择保存位置（建议 `~/Documents`）
   - 首次连接会提示确认，输入 `yes` 即可
3. **打开项目**：克隆完成后，Cursor 会提示是否打开，选择"打开"
4. **安装依赖**：
   - 在 Cursor 中按 `` Ctrl + ` `` 打开终端
   - 执行：`npm install`
   - 或者运行自动化脚本：`./scripts/setup-new-machine.sh`

### 方法 B：使用终端

```bash
# 1. 克隆仓库
cd ~/Documents
git clone git@github.com:chrisliuchaofan/ue-asset-library.git
cd ue-asset-library

# 2. 运行自动化设置脚本
./scripts/setup-new-machine.sh

# 或者手动安装依赖
npm install
```

**注意**：首次连接 GitHub 时，会提示确认主机指纹，输入 `yes` 即可。

### 3. 配置环境变量

复制 `.env.local` 文件（如果有）或根据 `VERCEL_ENV_VARIABLES.md` 配置环境变量。

## 🔄 日常同步工作流

### 在 Cursor 中同步（最简单 ⭐）

**开始工作前：**
1. 打开 Cursor，打开项目
2. 点击左侧源代码管理图标（或按 `Ctrl + Shift + G`）
3. 点击 `...` 菜单，选择 `Pull, Push` → `Pull`
4. 或者使用命令面板（`Cmd + Shift + P`），输入 `Git: Pull`

**完成工作后：**
1. 点击左侧源代码管理图标
2. 在"更改"区域，点击 `+` 添加所有更改（或点击文件旁的 `+` 单独添加）
3. 在上方输入框输入提交信息
4. 点击 `✓` 提交
5. 点击 `...` 菜单，选择 `Pull, Push` → `Push`

### 场景 1：在公司电脑上开始工作（从家里同步最新代码）

**使用 Cursor：**
- 打开项目 → 源代码管理 → `...` → `Pull`

**或使用终端：**
```bash
# 1. 进入项目目录
cd ~/Documents/ue-asset-library

# 2. 拉取最新代码
git pull origin main

# 3. 安装可能的新依赖
npm install
```

### 场景 2：在公司电脑上完成工作（推送到远程）

**使用 Cursor（推荐）：**
1. 源代码管理 → 添加更改 → 输入提交信息 → 提交 → 推送

**或使用终端：**
```bash
# 1. 查看更改状态
git status

# 2. 添加所有更改
git add -A

# 3. 提交更改（使用有意义的提交信息）
git commit -m "描述你的更改内容"

# 4. 推送到远程仓库
git push origin main
```

### 场景 3：在家里电脑上继续工作（从公司同步）

**使用 Cursor：**
- 打开项目 → 源代码管理 → `...` → `Pull`

**或使用终端：**
```bash
# 1. 进入项目目录
cd ~/Documents/ue-asset-library

# 2. 拉取最新代码
git pull origin main

# 3. 安装可能的新依赖
npm install
```

## ⚠️ 重要注意事项

### 1. 工作前先拉取

**每次开始工作前，务必先执行 `git pull`**，确保代码是最新的：

```bash
git pull origin main
```

### 2. 工作后及时推送

**每次完成工作后，及时推送更改**：

```bash
git add -A
git commit -m "你的提交信息"
git push origin main
```

### 3. 处理冲突

如果两台电脑同时修改了同一个文件，可能会产生冲突：

```bash
# 拉取时如果有冲突
git pull origin main

# 如果有冲突，Git 会提示
# 打开冲突文件，解决冲突标记（<<<<<<< ======= >>>>>>>）
# 然后：
git add <冲突文件>
git commit -m "解决冲突"
git push origin main
```

### 4. 查看当前状态

随时查看工作区状态：

```bash
git status          # 查看工作区状态
git log --oneline   # 查看提交历史
git diff            # 查看未提交的更改
```

## 📝 推荐工作流程

### 使用 Cursor（最简单 ⭐）

1. **开始工作前**：
   - 打开 Cursor → 打开项目
   - 源代码管理 → `...` → `Pull`

2. **进行开发工作**

3. **完成工作后**：
   - 源代码管理 → 添加更改 → 输入提交信息 → 提交 → 推送

### 使用终端

1. **开始工作前**：
   ```bash
   git pull origin main
   ```

2. **进行开发工作**

3. **完成工作后**：
   ```bash
   git status                    # 查看更改
   git add -A                    # 添加所有更改
   git commit -m "描述更改"      # 提交
   git push origin main          # 推送
   ```

### 快速检查清单

在切换电脑前，确保：

- [ ] 所有更改已提交：`git status` 显示 "nothing to commit"
- [ ] 已推送到远程：`git push origin main` 成功
- [ ] 在另一台电脑上已拉取：`git pull origin main` 成功

## 🔧 常用命令速查

```bash
# 查看状态
git status

# 查看提交历史
git log --oneline -10

# 拉取最新代码
git pull origin main

# 添加所有更改
git add -A

# 提交更改
git commit -m "提交信息"

# 推送到远程
git push origin main

# 查看未提交的更改
git diff

# 查看远程仓库信息
git remote -v
```

## 🆘 遇到问题？

### 问题 1：SSH 连接确认提示

首次使用 SSH 连接 GitHub 时，会看到：
```
Are you sure you want to continue connecting (yes/no/[fingerprint])?
```
**解决方法**：输入 `yes` 并按回车确认。

### 问题 2：推送被拒绝

如果看到 "Updates were rejected"，说明远程有新的提交：

```bash
# 先拉取，解决可能的冲突，再推送
git pull origin main
# 解决冲突后
git push origin main
```

### 问题 3：忘记拉取就开始工作

如果已经做了一些更改，但忘记先拉取：

```bash
# 先暂存当前更改
git stash

# 拉取最新代码
git pull origin main

# 恢复暂存的更改
git stash pop

# 如果有冲突，解决后提交
```

### 问题 4：想查看远程有什么新提交

```bash
# 查看远程更新（不合并）
git fetch origin

# 查看远程和本地的差异
git log HEAD..origin/main --oneline
```

## 🎯 Cursor 快捷键速查

- `Cmd + Shift + P`：打开命令面板（可搜索 Git 命令）
- `Ctrl + Shift + G`：打开源代码管理面板
- `` Ctrl + ` ``：打开/关闭终端
- `Cmd + K, Cmd + S`：打开快捷键设置

## 📌 当前版本信息

- **最新提交**：`7a4db75` - 添加双电脑同步指南
- **远程仓库**：`git@github.com:chrisliuchaofan/ue-asset-library.git`
- **主分支**：`main`
- **自动化脚本**：`scripts/setup-new-machine.sh`

---

**记住**：工作前拉取，工作后推送！这样就能保持两台电脑同步了。✨
