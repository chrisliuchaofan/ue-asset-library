# Git 推送指南

## 解决 403 权限错误

### 方法 1：使用 Personal Access Token（推荐）

1. **生成 Token**
   - 访问：https://github.com/settings/tokens
   - 点击 "Generate new token (classic)"
   - Note: `ue-asset-library`
   - 勾选 `repo` 权限
   - 生成并复制 token

2. **推送代码**
   ```bash
   cd "/Users/shenghua/Documents/恒星UE资产库/web"
   git push -u origin main
   ```
   
   当提示输入时：
   - **Username**: `chrisliuchaofan`
   - **Password**: 粘贴刚才生成的 token（不是 GitHub 密码）

3. **保存凭据（可选）**
   macOS 会自动将凭据保存到钥匙串，下次推送不需要再输入。

### 方法 2：在 URL 中直接使用 token（临时）

```bash
cd "/Users/shenghua/Documents/恒星UE资产库/web"
git push https://YOUR_TOKEN@github.com/chrisliuchaofan/ue-asset-library.git main
```

将 `YOUR_TOKEN` 替换为你的实际 token。

### 方法 3：配置 SSH（长期方案）

如果你想要更安全的 SSH 方式：

1. **生成 SSH 密钥**
   ```bash
   ssh-keygen -t ed25519 -C "your_email@example.com"
   # 按回车使用默认路径，设置密码（可选）
   ```

2. **复制公钥**
   ```bash
   cat ~/.ssh/id_ed25519.pub
   # 复制输出的内容
   ```

3. **添加到 GitHub**
   - 访问：https://github.com/settings/keys
   - 点击 "New SSH key"
   - 粘贴公钥内容
   - 保存

4. **更新远程仓库 URL**
   ```bash
   git remote set-url origin git@github.com:chrisliuchaofan/ue-asset-library.git
   ```

5. **推送**
   ```bash
   git push -u origin main
   ```

## 常见问题

### 403 错误
- 检查 token 是否有 `repo` 权限
- 确认 token 未过期
- 确认用户名输入正确（`chrisliuchaofan`）

### 仓库不存在
- 确认仓库 URL 正确
- 确认你有仓库的写权限
- 如果仓库不存在，先在 GitHub 创建仓库

### 凭据问题
- macOS 钥匙串可能保存了错误的凭据
- 删除旧凭据：系统设置 → 密码 → 搜索 "github.com" → 删除
- 重新推送时会提示输入新凭据


