# 服务器部署指南

## 部署步骤概览

1. ✅ 服务器安全加固（已完成）
2. 安装运行环境（Node.js, npm）
3. 克隆/上传项目代码
4. 安装依赖
5. 配置环境变量
6. 构建项目
7. 配置 PM2 进程管理
8. 配置 Nginx 反向代理
9. 配置 SSL 证书（HTTPS）
10. 启动服务

---

## 步骤 1: 安装 Node.js 和必要工具

```bash
# 更新系统
sudo apt-get update

# 安装 Node.js 20.x（LTS 版本）
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 验证安装
node --version
npm --version

# 安装 PM2（进程管理器）
sudo npm install -g pm2

# 安装 Nginx
sudo apt-get install -y nginx

# 安装 Git（如果还没安装）
sudo apt-get install -y git
```

---

## 步骤 2: 部署项目代码

### 方式 A: 使用 Git（推荐）

```bash
# 切换到普通用户
su - $NEW_USER  # 替换为你的用户名

# 创建项目目录
mkdir -p ~/projects
cd ~/projects

# 克隆项目（如果有 Git 仓库）
# git clone https://your-repo-url.git ue-asset-library
# cd ue-asset-library

# 或者如果你需要从本地上传，使用方式 B
```

### 方式 B: 从本地上传

```bash
# 在本地机器执行（压缩项目，排除 node_modules 和 .next）
cd /Users/chrisl/Documents/恒星UE资产库/web
tar --exclude='node_modules' --exclude='.next' --exclude='.git' \
    -czf project.tar.gz .

# 上传到服务器
scp project.tar.gz $NEW_USER@YOUR_SERVER_IP:~/projects/

# 在服务器上解压
ssh $NEW_USER@YOUR_SERVER_IP
cd ~/projects
tar -xzf project.tar.gz -C ue-asset-library
cd ue-asset-library
```

---

## 步骤 3: 安装依赖和构建

```bash
# 在项目目录下
cd ~/projects/ue-asset-library  # 或你的项目路径

# 安装依赖
npm install

# 构建项目（生产环境）
npm run build
```

---

## 步骤 4: 配置环境变量

```bash
# 创建 .env.production 文件
nano .env.production
```

**重要：根据 ENV_SETUP.md 配置所有必需的环境变量**

最小配置示例：
```env
# 存储模式
STORAGE_MODE=oss
NEXT_PUBLIC_STORAGE_MODE=oss

# OSS 配置
OSS_BUCKET=你的bucket名称
OSS_REGION=oss-cn-hangzhou
OSS_ACCESS_KEY_ID=你的AccessKeyId
OSS_ACCESS_KEY_SECRET=你的AccessKeySecret
NEXT_PUBLIC_OSS_BUCKET=你的bucket名称
NEXT_PUBLIC_OSS_REGION=oss-cn-hangzhou
NEXT_PUBLIC_CDN_BASE=/

# AI 服务配置
AI_IMAGE_API_KEY=你的API_KEY
JIMENG_ACCESS_KEY=你的AccessKey
JIMENG_SECRET_KEY=你的SecretKey

# Next.js 配置
NODE_ENV=production
PORT=3000
```

保存后：
```bash
# 设置文件权限（保护敏感信息）
chmod 600 .env.production
```

---

## 步骤 5: 配置 PM2

```bash
# 创建 PM2 配置文件
nano ecosystem.config.js
```

内容：
```javascript
module.exports = {
  apps: [{
    name: 'ue-asset-library',
    script: 'npm',
    args: 'start',
    cwd: '/home/YOUR_USERNAME/projects/ue-asset-library',  // 替换为实际路径
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
  }]
};
```

启动应用：
```bash
# 创建日志目录
mkdir -p logs

# 启动应用
pm2 start ecosystem.config.js

# 查看状态
pm2 status

# 查看日志
pm2 logs ue-asset-library

# 设置开机自启
pm2 startup
pm2 save
```

---

## 步骤 6: 配置 Nginx 反向代理

```bash
# 创建 Nginx 配置文件
sudo nano /etc/nginx/sites-available/ue-asset-library
```

内容：
```nginx
server {
    listen 80;
    server_name your-domain.com;  # 替换为你的域名或 IP

    # 允许大文件上传（如果需要）
    client_max_body_size 100M;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # 超时设置
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # 静态资源缓存
    location /_next/static {
        proxy_pass http://localhost:3000;
        proxy_cache_valid 200 365d;
        add_header Cache-Control "public, immutable";
    }
}
```

启用配置：
```bash
# 创建软链接
sudo ln -s /etc/nginx/sites-available/ue-asset-library /etc/nginx/sites-enabled/

# 删除默认配置（可选）
sudo rm /etc/nginx/sites-enabled/default

# 测试配置
sudo nginx -t

# 重启 Nginx
sudo systemctl restart nginx
```

---

## 步骤 7: 配置 SSL 证书（HTTPS）

### 使用 Certbot（Let's Encrypt 免费证书）

```bash
# 安装 Certbot
sudo apt-get install -y certbot python3-certbot-nginx

# 如果有域名，申请证书
sudo certbot --nginx -d your-domain.com

# 自动续期测试
sudo certbot renew --dry-run
```

### 如果没有域名（使用 IP）

可以使用自签名证书（浏览器会显示警告）或使用 Cloudflare 等服务的证书。

---

## 步骤 8: 验证部署

```bash
# 1. 检查 PM2 状态
pm2 status

# 2. 检查 Nginx 状态
sudo systemctl status nginx

# 3. 检查端口监听
sudo netstat -tlnp | grep :3000
sudo netstat -tlnp | grep :80
sudo netstat -tlnp | grep :443

# 4. 检查防火墙
sudo ufw status

# 5. 查看应用日志
pm2 logs ue-asset-library --lines 50
```

---

## 常用维护命令

```bash
# 重启应用
pm2 restart ue-asset-library

# 停止应用
pm2 stop ue-asset-library

# 查看实时日志
pm2 logs ue-asset-library

# 重新构建并重启
cd ~/projects/ue-asset-library
npm run build
pm2 restart ue-asset-library

# 更新代码后
git pull  # 或重新上传
npm install
npm run build
pm2 restart ue-asset-library

# 查看服务器资源使用
pm2 monit
htop
```

---

## 故障排查

### 应用无法启动
```bash
# 查看 PM2 日志
pm2 logs ue-asset-library --err

# 检查端口是否被占用
sudo lsof -i :3000

# 检查环境变量
pm2 env ue-asset-library
```

### Nginx 502 错误
```bash
# 检查应用是否运行
pm2 status

# 检查应用日志
pm2 logs ue-asset-library

# 检查 Nginx 错误日志
sudo tail -f /var/log/nginx/error.log
```

### 防火墙问题
```bash
# 检查防火墙规则
sudo ufw status verbose

# 临时禁用防火墙测试
sudo ufw disable

# 重新启用
sudo ufw enable
```

---

## 安全建议

1. ✅ 定期更新系统：`sudo apt-get update && sudo apt-get upgrade`
2. ✅ 定期备份项目数据和数据库
3. ✅ 监控服务器资源使用情况
4. ✅ 定期检查日志文件
5. ✅ 保持 Node.js 和依赖包更新
6. ✅ 使用强密码和 SSH Key
7. ✅ 定期审查防火墙规则

