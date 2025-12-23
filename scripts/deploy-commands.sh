#!/bin/bash
# 快速部署命令 - 直接在服务器上执行
# 使用方法: 按顺序复制粘贴执行

# ============================================
# 步骤 1: 安装运行环境
# ============================================
echo "步骤 1: 安装 Node.js, PM2, Nginx..."

# 更新系统
sudo apt-get update

# 安装 Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 验证安装
node --version
npm --version

# 安装 PM2
sudo npm install -g pm2

# 安装 Nginx
sudo apt-get install -y nginx

# 安装 Git（如果需要）
sudo apt-get install -y git

echo "✓ 环境安装完成"
echo ""

# ============================================
# 步骤 2: 准备项目目录
# ============================================
echo "步骤 2: 准备项目目录..."
echo "请手动执行以下操作："
echo "1. 从本地上传项目代码到服务器"
echo "2. 或使用 Git 克隆项目"
echo ""
echo "示例命令（使用 Git）:"
echo "  mkdir -p ~/projects"
echo "  cd ~/projects"
echo "  git clone YOUR_REPO_URL ue-asset-library"
echo "  cd ue-asset-library"
echo ""
echo "示例命令（从本地上传）:"
echo "  # 在本地: tar --exclude='node_modules' --exclude='.next' --exclude='.git' -czf project.tar.gz ."
echo "  # 上传: scp project.tar.gz USER@SERVER_IP:~/projects/"
echo "  # 在服务器: cd ~/projects && mkdir -p ue-asset-library && tar -xzf project.tar.gz -C ue-asset-library"
echo ""
read -p "项目代码已准备好？(y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "请先准备好项目代码后再继续"
    exit 1
fi

# ============================================
# 步骤 3: 配置环境变量
# ============================================
echo ""
echo "步骤 3: 配置环境变量..."
echo "请创建 .env.production 文件并配置所有必需的环境变量"
echo "参考 ENV_SETUP.md 文件"
echo ""
read -p "环境变量已配置？(y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "请先配置环境变量后再继续"
    exit 1
fi

# ============================================
# 步骤 4: 安装依赖和构建
# ============================================
echo ""
echo "步骤 4: 安装依赖和构建项目..."

PROJECT_DIR=$(pwd)
if [ ! -f "package.json" ]; then
    echo "错误: 请在项目根目录执行此脚本"
    exit 1
fi

npm install
npm run build

echo "✓ 构建完成"
echo ""

# ============================================
# 步骤 5: 配置 PM2
# ============================================
echo "步骤 5: 配置 PM2..."

# 创建 PM2 配置文件
if [ ! -f "ecosystem.config.js" ]; then
    cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'ue-asset-library',
    script: 'npm',
    args: 'start',
    cwd: '$PROJECT_DIR',
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
EOF
    echo "✓ 已创建 ecosystem.config.js"
fi

# 创建日志目录
mkdir -p logs

# 启动应用
if pm2 list | grep -q "ue-asset-library"; then
    pm2 restart ue-asset-library
else
    pm2 start ecosystem.config.js
fi

# 配置开机自启
pm2 startup
echo "请执行上面显示的命令（需要 root 权限）"
pm2 save

echo "✓ PM2 配置完成"
echo ""

# ============================================
# 步骤 6: 配置 Nginx
# ============================================
echo "步骤 6: 配置 Nginx..."
echo "请输入你的域名或 IP 地址:"
read -r SERVER_NAME

if [ -z "$SERVER_NAME" ]; then
    SERVER_NAME="localhost"
fi

# 创建 Nginx 配置
sudo tee /etc/nginx/sites-available/ue-asset-library > /dev/null << EOF
server {
    listen 80;
    server_name $SERVER_NAME;

    client_max_body_size 100M;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
    }

    location /_next/static {
        proxy_pass http://localhost:3000;
        proxy_cache_valid 200 365d;
        add_header Cache-Control "public, immutable";
    }
}
EOF

# 启用配置
sudo ln -sf /etc/nginx/sites-available/ue-asset-library /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# 测试配置
sudo nginx -t

if [ $? -eq 0 ]; then
    sudo systemctl restart nginx
    echo "✓ Nginx 配置完成"
else
    echo "✗ Nginx 配置有误，请检查"
    exit 1
fi

echo ""

# ============================================
# 完成
# ============================================
echo "=========================================="
echo "✓ 部署完成！"
echo "=========================================="
echo ""
echo "应用状态:"
pm2 status
echo ""
echo "访问地址: http://$SERVER_NAME"
echo ""
echo "常用命令:"
echo "  查看日志: pm2 logs ue-asset-library"
echo "  重启应用: pm2 restart ue-asset-library"
echo "  查看 Nginx 日志: sudo tail -f /var/log/nginx/error.log"
echo ""
echo "下一步（可选）: 配置 HTTPS (SSL 证书)"
echo "  如果有域名: sudo certbot --nginx -d $SERVER_NAME"









