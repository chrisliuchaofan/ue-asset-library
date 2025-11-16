# 双电脑同步指南

本指南帮助您在家里和公司两台电脑之间保持代码同步。

## 📋 前提条件

1. **Git 已安装**：两台电脑都需要安装 Git
2. **SSH 密钥配置**：两台电脑都需要配置 GitHub SSH 密钥（见下方详细步骤）
3. **远程仓库地址**：`git@github.com:chrisliuchaofan/ue-asset-library.git`

## 🔑 配置 SSH 密钥（重要！）

如果遇到 `Permission denied (publickey)` 错误，说明需要配置 SSH 密钥。

### 步骤 1：检查是否已有 SSH 密钥

在 Cursor 终端中执行：
```bash
ls -la ~/.ssh
```

如果看到 `id_rsa` 或 `id_ed25519` 文件，说明已有密钥，跳到步骤 3。

### 步骤 2：生成新的 SSH 密钥

在 Cursor 终端中执行（替换为你的 GitHub 邮箱）：
```bash
ssh-keygen -t ed25519 -C "your_email@example.com"
```

- 按回车使用默认保存位置（`~/.ssh/id_ed25519`）
- 可以设置密码（建议设置，更安全），或直接按回车跳过

### 步骤 3：将公钥添加到 GitHub

1. **复制公钥内容**：
   ```bash
   cat ~/.ssh/id_ed25519.pub
   ```
   或者：
   ```bash
   cat ~/.ssh/id_rsa.pub
   ```
   复制输出的全部内容（以 `ssh-ed25519` 或 `ssh-rsa` 开头）

2. **添加到 GitHub**：
   - 打开 https://github.com/settings/keys
   - 点击 "New SSH key"
   - Title 填写：`MacBook-Air-3`（或任意名称）
   - Key 粘贴刚才复制的公钥内容
   - 点击 "Add SSH key"

3. **测试连接**：
   ```bash
   ssh -T git@github.com
   ```
   如果看到 `Hi chrisliuchaofan! You've successfully authenticated...`，说明配置成功！

### 步骤 4：重新克隆

SSH 配置成功后，在 Cursor 中重新执行克隆操作。

### 替代方案：使用 HTTPS（如果 SSH 配置困难）

如果 SSH 配置遇到问题，可以使用 HTTPS 方式：

1. **在 Cursor 中克隆时，使用 HTTPS 地址**：
   ```
   https://github.com/chrisliuchaofan/ue-asset-library.git
   ```

2. **首次推送时需要输入 GitHub 用户名和 Personal Access Token**（不是密码）
   - 生成 Token：https://github.com/settings/tokens
   - 点击 "Generate new token (classic)"
   - 勾选 `repo` 权限
   - 复制生成的 token（只显示一次，请保存好）

## 🔄 更新已有项目（如果另一台电脑已有旧版本）

如果另一台电脑上已经有项目代码（比如之前用U盘传的），需要连接到Git仓库并更新到最新版本：

### 方法 A：使用 Cursor（推荐 ⭐）

1. **打开 Cursor，打开已有项目**
2. **检查是否已连接Git仓库**：
   - 点击左侧源代码管理图标（`Ctrl + Shift + G`）
   - 如果显示"未检测到Git仓库"，需要初始化

3. **如果未连接Git，在终端中执行**：
   ```bash
   # 进入项目目录
   cd ~/Documents/你的项目目录
   
   # 初始化Git（如果还没有）
   git init
   
   # 添加远程仓库
   git remote add origin git@github.com:chrisliuchaofan/ue-asset-library.git
   
   # 拉取最新代码
   git pull origin main --allow-unrelated-histories
   ```
   
   **注意**：如果遇到冲突，可能需要先备份本地更改，或者选择保留远程版本：
   ```bash
   # 如果想保留远程版本（覆盖本地）
   git fetch origin
   git reset --hard origin/main
   ```

4. **如果已连接Git，直接拉取**：
   - 在 Cursor 中：源代码管理 → `...` → `Pull, Push` → `Pull`
   - 或在终端：`git pull origin main`

5. **安装可能的新依赖**：
   ```bash
   npm install
   ```

### 方法 B：使用终端

```bash
# 1. 进入项目目录
cd ~/Documents/你的项目目录

# 2. 检查是否已有Git仓库
git status

# 3a. 如果没有Git仓库，初始化并连接
git init
git remote add origin git@github.com:chrisliuchaofan/ue-asset-library.git
git pull origin main --allow-unrelated-histories

# 3b. 如果已有Git仓库，检查远程地址
git remote -v
# 如果远程地址不对，更新它：
git remote set-url origin git@github.com:chrisliuchaofan/ue-asset-library.git
git pull origin main

# 4. 安装依赖
npm install
```

## 🚀 首次设置（在第二台电脑上，全新安装）

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

## ✅ 检查版本一致性

### 方法 1：使用检查脚本（最简单 ⭐）

在**两台电脑上**分别运行：

```bash
./scripts/check-sync-status.sh
```

脚本会显示：
- ✅ 本地版本与远程版本是否一致
- 📌 当前提交哈希和提交信息
- ⚠️ 是否有未提交的更改
- 📊 本地和远程的差异详情

**判断标准**：如果两台电脑显示的"提交哈希"相同，说明版本一致！

### 方法 2：手动检查

**在每台电脑上执行：**

```bash
# 查看当前提交哈希（短版本）
git rev-parse --short HEAD

# 查看当前提交信息
git log -1 --oneline

# 查看远程最新提交哈希
git fetch origin
git rev-parse --short origin/main

# 比较本地和远程
git log --oneline -1 HEAD
git log --oneline -1 origin/main
```

**判断标准**：
- 如果两台电脑的 `git rev-parse --short HEAD` 输出相同 → ✅ 版本一致
- 如果不同 → ⚠️ 需要同步

### 方法 3：在 Cursor 中查看

1. 打开源代码管理面板（`Ctrl + Shift + G`）
2. 查看底部状态栏，会显示当前分支和提交信息
3. 点击提交信息，可以看到完整的提交哈希
4. 在另一台电脑上查看相同的提交哈希即可确认

### 快速对比命令

如果想快速对比两台电脑的版本，可以在每台电脑上运行：

```bash
echo "当前版本: $(git rev-parse --short HEAD) - $(git log -1 --pretty=format:'%s')"
```

然后比较两台电脑的输出结果。

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

### 问题 1：Permission denied (publickey)

**错误信息**：
```
git@github.com: Permission denied (publickey).
fatal: Could not read from remote repository.
```

**解决方法**：需要配置 SSH 密钥，详见上方"🔑 配置 SSH 密钥"章节。

**快速解决**：
1. 检查是否有密钥：`ls -la ~/.ssh`
2. 如果没有，生成密钥：`ssh-keygen -t ed25519 -C "your_email@example.com"`
3. 复制公钥：`cat ~/.ssh/id_ed25519.pub`
4. 添加到 GitHub：https://github.com/settings/keys
5. 测试：`ssh -T git@github.com`

**或者使用 HTTPS**：在克隆时使用 `https://github.com/chrisliuchaofan/ue-asset-library.git`

### 问题 2：SSH 连接确认提示

首次使用 SSH 连接 GitHub 时，会看到：
```
Are you sure you want to continue connecting (yes/no/[fingerprint])?
```
**解决方法**：输入 `yes` 并按回车确认。

### 问题 3：推送被拒绝

如果看到 "Updates were rejected"，说明远程有新的提交：

```bash
# 先拉取，解决可能的冲突，再推送
git pull origin main
# 解决冲突后
git push origin main
```

### 问题 4：忘记拉取就开始工作

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

### 问题 5：想查看远程有什么新提交

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
