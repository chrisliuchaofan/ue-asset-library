# 双电脑同步指南

本指南帮助您在家里和公司两台电脑之间保持代码同步。

## 📋 前提条件

1. **Git 已安装**：两台电脑都需要安装 Git
2. **SSH 密钥配置**：两台电脑都需要配置 GitHub SSH 密钥
3. **远程仓库地址**：`git@github.com:chrisliuchaofan/ue-asset-library.git`

## 🚀 首次设置（在第二台电脑上）

### 1. 克隆仓库

```bash
cd ~/Documents
git clone git@github.com:chrisliuchaofan/ue-asset-library.git
cd ue-asset-library/web
```

### 2. 安装依赖

```bash
npm install
```

### 3. 配置环境变量

复制 `.env.local` 文件（如果有）或根据 `VERCEL_ENV_VARIABLES.md` 配置环境变量。

## 🔄 日常同步工作流

### 场景 1：在公司电脑上开始工作（从家里同步最新代码）

```bash
# 1. 进入项目目录
cd ~/Documents/恒星UE资产库/web

# 2. 拉取最新代码
git pull origin main

# 3. 安装可能的新依赖
npm install
```

### 场景 2：在公司电脑上完成工作（推送到远程）

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

```bash
# 1. 进入项目目录
cd ~/Documents/恒星UE资产库/web

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

### 标准流程（推荐）

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

### 问题 1：推送被拒绝

如果看到 "Updates were rejected"，说明远程有新的提交：

```bash
# 先拉取，解决可能的冲突，再推送
git pull origin main
# 解决冲突后
git push origin main
```

### 问题 2：忘记拉取就开始工作

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

### 问题 3：想查看远程有什么新提交

```bash
# 查看远程更新（不合并）
git fetch origin

# 查看远程和本地的差异
git log HEAD..origin/main --oneline
```

## 📌 当前版本信息

- **最新提交**：`9200a76` - 备份当前工作版本
- **远程仓库**：`git@github.com:chrisliuchaofan/ue-asset-library.git`
- **主分支**：`main`

---

**记住**：工作前拉取，工作后推送！这样就能保持两台电脑同步了。✨

