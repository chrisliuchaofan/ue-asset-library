#!/bin/bash
# Next.js 项目快速部署脚本
# 使用方法: 在项目根目录执行 bash scripts/deploy.sh

set -e

echo "=========================================="
echo "Next.js 项目部署脚本"
echo "=========================================="
echo ""

# 颜色输出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# 检查是否在项目根目录
if [ ! -f "package.json" ]; then
    echo -e "${RED}错误: 请在项目根目录执行此脚本${NC}"
    exit 1
fi

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}错误: 未安装 Node.js，请先安装 Node.js 20.x${NC}"
    echo "执行: curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt-get install -y nodejs"
    exit 1
fi

echo -e "${GREEN}✓ Node.js 版本: $(node --version)${NC}"
echo -e "${GREEN}✓ npm 版本: $(npm --version)${NC}"

# 检查环境变量文件
if [ ! -f ".env.production" ]; then
    echo -e "${YELLOW}警告: 未找到 .env.production 文件${NC}"
    echo "请创建 .env.production 并配置必需的环境变量"
    read -p "是否继续？(y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo ""
echo "步骤 1: 安装依赖..."
npm install

echo ""
echo "步骤 2: 构建项目..."
npm run build

echo ""
echo "步骤 3: 检查 PM2..."

if ! command -v pm2 &> /dev/null; then
    echo "安装 PM2..."
    sudo npm install -g pm2
fi

# 检查是否有 ecosystem.config.js
if [ ! -f "ecosystem.config.js" ]; then
    echo -e "${YELLOW}未找到 ecosystem.config.js，创建默认配置...${NC}"
    
    PROJECT_PATH=$(pwd)
    cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'ue-asset-library',
    script: 'npm',
    args: 'start',
    cwd: '$PROJECT_PATH',
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
    echo -e "${GREEN}✓ 已创建 ecosystem.config.js${NC}"
fi

# 创建日志目录
mkdir -p logs

echo ""
echo "步骤 4: 启动/重启应用..."

# 检查应用是否已在运行
if pm2 list | grep -q "ue-asset-library"; then
    echo "应用已在运行，执行重启..."
    pm2 restart ue-asset-library
else
    echo "启动应用..."
    pm2 start ecosystem.config.js
fi

echo ""
echo "步骤 5: 配置 PM2 开机自启..."

# 检查是否已配置 startup
if ! pm2 startup | grep -q "already setup"; then
    pm2 startup
    echo -e "${YELLOW}请执行上面显示的命令（需要 root 权限）${NC}"
fi

pm2 save

echo ""
echo "=========================================="
echo -e "${GREEN}✓ 部署完成！${NC}"
echo "=========================================="
echo ""
echo "应用状态:"
pm2 status

echo ""
echo "查看日志: pm2 logs ue-asset-library"
echo "重启应用: pm2 restart ue-asset-library"
echo "停止应用: pm2 stop ue-asset-library"
echo ""
echo "下一步: 配置 Nginx 反向代理（参考 deploy-guide.md）"








