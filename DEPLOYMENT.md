# 部署指南

## 概述

当你使用 OSS 存储后，你的资产库可以部署到任何支持 Node.js 的服务器上，让别人通过网址访问。

## 部署方式

### 方式 1：部署到 NAS（内网访问）

如果你有 NAS，可以：

1. **在 NAS 上安装 Node.js**
   - 群晖：通过套件中心安装 Node.js
   - 威联通：通过 App Center 安装 Node.js

2. **上传项目文件到 NAS**
   - 将整个 `web` 目录上传到 NAS

3. **在 NAS 上运行**
   ```bash
   cd /path/to/web
   npm install
   npm run build
   npm start
   ```

4. **配置 NAS Web 服务**
   - 在 NAS 的 Web Station 中配置反向代理
   - 将域名或 IP 指向 Node.js 应用的端口（默认 3000）

5. **访问地址**
   - 内网访问：`http://你的NAS-IP:端口`
   - 如果配置了域名：`http://你的域名`

### 方式 2：部署到云服务器（公网访问）

如果你有云服务器（如阿里云 ECS）：

1. **准备服务器**
   - 安装 Node.js 18+
   - 安装 Git（可选）

2. **上传项目**
   ```bash
   # 方式 A：使用 Git
   git clone 你的仓库
   cd web
   npm install
   
   # 方式 B：直接上传文件
   # 使用 scp 或 FTP 上传项目文件
   ```

3. **配置环境变量**
   ```bash
   # 创建 .env.local 文件
   STORAGE_MODE=oss
   NEXT_PUBLIC_STORAGE_MODE=oss
   OSS_BUCKET=你的bucket名称
   OSS_REGION=oss-cn-guangzhou
   OSS_ACCESS_KEY_ID=你的AccessKeyId
   OSS_ACCESS_KEY_SECRET=你的AccessKeySecret
   NEXT_PUBLIC_CDN_BASE=https://你的CDN域名
   # 或者不配置 CDN，使用 OSS 外网域名
   ```

4. **构建和启动**
   ```bash
   npm run build
   npm start
   ```

5. **使用 PM2 管理进程（推荐）**
   ```bash
   npm install -g pm2
   pm2 start npm --name "ue-asset-library" -- start
   pm2 save
   pm2 startup  # 设置开机自启
   ```

6. **配置 Nginx 反向代理（可选）**
   ```nginx
   server {
       listen 80;
       server_name 你的域名;
       
       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

7. **配置 HTTPS（推荐）**
   - 使用 Let's Encrypt 免费证书
   - 或使用阿里云 SSL 证书

### 方式 3：部署到 Vercel/Netlify（最简单）

1. **连接 GitHub/GitLab**
   - 将项目推送到代码仓库

2. **在 Vercel 部署**
   - 访问 [vercel.com](https://vercel.com)
   - 导入项目
   - 配置环境变量
   - 自动部署

3. **访问地址**
   - Vercel 会自动分配域名：`你的项目.vercel.app`
   - 也可以绑定自定义域名

## OSS 配置要点

### 1. 确保 OSS Bucket 有公共读权限

在阿里云 OSS 控制台：
- 进入你的 Bucket
- 权限管理 → 读写权限
- 设置为"公共读"（如果想让别人直接访问图片）
- 或者使用 CDN 加速（推荐）

### 2. 配置 CDN（推荐）

1. **开通阿里云 CDN**
2. **添加加速域名**
   - 源站类型：OSS 域名
   - 选择你的 Bucket
3. **配置 CNAME**
4. **在 `.env.local` 中设置**：
   ```env
   NEXT_PUBLIC_CDN_BASE=https://你的CDN域名
   ```

### 3. 图片 URL 格式

- **使用 OSS 直接访问**：
  ```
  https://你的bucket.oss-cn-guangzhou.aliyuncs.com/assets/xxx.jpg
  ```

- **使用 CDN 访问**（推荐，更快）：
  ```
  https://你的CDN域名/assets/xxx.jpg
  ```

## 访问流程

1. **用户访问你的网站**
   - 例如：`https://你的域名/assets`

2. **前端加载资产列表**
   - 从 OSS 读取 `manifest.json`
   - 显示资产列表

3. **显示图片/视频**
   - 图片 URL 指向 OSS 或 CDN
   - 浏览器直接加载，无需经过你的服务器

## 安全建议

1. **后台管理页面保护**
   - 建议添加登录验证
   - 或使用 IP 白名单限制访问

2. **OSS 权限**
   - 使用 RAM 子账号，仅授予必要权限
   - 不要使用主账号 AccessKey

3. **HTTPS**
   - 生产环境务必使用 HTTPS
   - 保护数据传输安全

## 常见问题

### Q: 别人访问时图片加载很慢？
A: 使用 CDN 加速，或选择离用户较近的 OSS 地域。

### Q: 可以限制某些资产不对外显示吗？
A: 可以在后台管理页面删除，或修改 manifest.json 过滤。

### Q: 如何备份数据？
A: manifest.json 在 OSS 中，资产文件也在 OSS，阿里云会自动备份。

### Q: 费用如何？
A: OSS 存储和流量费用，CDN 流量费用。具体查看阿里云定价。


