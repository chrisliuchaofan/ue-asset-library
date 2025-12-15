# GitHub Secrets 配置指南

**用途：** 配置后端自动部署所需的 Secrets

---

## 📋 需要的 Secrets

### 1. ECS_HOST
**说明：** 服务器 IP 地址或域名

**获取方法：**
```bash
# 方法 1：查看服务器控制台
# 在阿里云 ECS 控制台查看公网 IP

# 方法 2：在服务器上执行
curl ifconfig.me
```

**示例值：**
```
47.xxx.xxx.xxx
```

---

### 2. ECS_USERNAME
**说明：** SSH 登录用户名

**通常值：**
- Linux 服务器：`root`
- 其他：根据实际情况填写

**示例值：**
```
root
```

---

### 3. ECS_SSH_KEY
**说明：** SSH 私钥内容

**生成方法：**

**如果还没有 SSH 密钥：**
```bash
# 1. 生成 SSH 密钥对
ssh-keygen -t rsa -b 4096 -C "github-actions-deploy"
# 按提示操作，可以设置密码或直接回车

# 2. 查看私钥内容（复制全部内容）
cat ~/.ssh/id_rsa

# 3. 将公钥添加到服务器
ssh-copy-id -i ~/.ssh/id_rsa.pub root@your-server-ip
# 或手动添加：
# cat ~/.ssh/id_rsa.pub | ssh root@your-server-ip "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys"
```

**如果已有 SSH 密钥：**
```bash
# 查看私钥内容
cat ~/.ssh/id_rsa
```

**私钥格式示例：**
```
-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEA...
（多行内容）
-----END RSA PRIVATE KEY-----
```

---

## 🔧 配置步骤

### 步骤 1：访问 Secrets 设置页面

1. 访问 GitHub 仓库
2. 点击 **Settings** 标签
3. 左侧菜单选择 **Secrets and variables** → **Actions**
4. 点击 **New repository secret** 按钮

### 步骤 2：添加 Secrets

**添加 ECS_HOST：**
- Name: `ECS_HOST`
- Secret: 服务器 IP 地址（如：`47.xxx.xxx.xxx`）
- 点击 **Add secret**

**添加 ECS_USERNAME：**
- Name: `ECS_USERNAME`
- Secret: SSH 用户名（通常是 `root`）
- 点击 **Add secret**

**添加 ECS_SSH_KEY：**
- Name: `ECS_SSH_KEY`
- Secret: SSH 私钥内容（完整内容，包括 `-----BEGIN` 和 `-----END` 行）
- 点击 **Add secret**

---

## ✅ 验证配置

### 方法 1：手动测试 SSH 连接

```bash
# 使用配置的密钥测试连接
ssh -i ~/.ssh/id_rsa root@your-server-ip

# 如果连接成功，说明配置正确
```

### 方法 2：查看 GitHub Actions 日志

1. 访问：`https://github.com/chrisliuchaofan/ue-asset-library/actions`
2. 点击最新的部署任务
3. 查看 "Deploy to ECS" 步骤的日志
4. 如果看到 "✅ 部署完成！"，说明配置正确

---

## ⚠️ 常见问题

### 问题 1：SSH 连接失败

**错误信息：**
```
Permission denied (publickey)
```

**解决方法：**
1. 确认 SSH 密钥已添加到服务器的 `~/.ssh/authorized_keys`
2. 确认 `ECS_USERNAME` 正确
3. 确认 `ECS_SSH_KEY` 包含完整的私钥内容（包括 BEGIN 和 END 行）

### 问题 2：目录不存在

**错误信息：**
```
❌ 错误：目录 /opt/ue-assets-backend/backend-api 不存在
```

**解决方法：**
1. 确认服务器上的目录路径正确
2. 或修改工作流配置中的路径

### 问题 3：PM2 进程不存在

**错误信息：**
```
❌ PM2 restart 失败
```

**解决方法：**
1. 确认 PM2 进程名称正确（`ue-assets-backend`）
2. 或首次部署时使用 `pm2 start` 而不是 `pm2 restart`

---

## 📝 检查清单

- [ ] `ECS_HOST` 已配置（服务器 IP）
- [ ] `ECS_USERNAME` 已配置（通常是 `root`）
- [ ] `ECS_SSH_KEY` 已配置（SSH 私钥完整内容）
- [ ] SSH 密钥已添加到服务器的 `authorized_keys`
- [ ] 可以手动 SSH 连接到服务器
- [ ] 服务器上目录 `/opt/ue-assets-backend/backend-api` 存在
- [ ] PM2 进程 `ue-assets-backend` 存在（或可以启动）

---

**配置完成后，下次推送代码时会自动触发部署！**


