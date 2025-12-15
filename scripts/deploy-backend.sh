#!/bin/bash

# 后端部署脚本
# 使用方法: ./scripts/deploy-backend.sh [服务器IP] [用户名]

set -e

SERVER_IP="${1:-your-server-ip}"
SERVER_USER="${2:-root}"
BACKEND_DIR="/opt/ue-assets-backend/backend-api"
LOCAL_BACKEND_DIR="$(dirname "$0")/../backend-api"

echo "🚀 开始部署后端代码..."
echo "服务器: $SERVER_USER@$SERVER_IP"
echo "目标目录: $BACKEND_DIR"
echo ""

# 检查本地构建文件
if [ ! -d "$LOCAL_BACKEND_DIR/dist" ]; then
    echo "❌ 错误: 找不到 dist 目录，请先运行 npm run build"
    exit 1
fi

echo "📦 上传文件到服务器..."

# 上传构建后的文件
scp -r "$LOCAL_BACKEND_DIR/dist" "$SERVER_USER@$SERVER_IP:$BACKEND_DIR/"
scp "$LOCAL_BACKEND_DIR/package.json" "$SERVER_USER@$SERVER_IP:$BACKEND_DIR/"
scp "$LOCAL_BACKEND_DIR/ecosystem.config.js" "$SERVER_USER@$SERVER_IP:$BACKEND_DIR/"

echo "✅ 文件上传完成"
echo ""

echo "🔄 在服务器上安装依赖并重启服务..."
echo ""

# 在服务器上执行命令
ssh "$SERVER_USER@$SERVER_IP" << EOF
    set -e
    cd $BACKEND_DIR
    
    echo "📥 安装依赖..."
    npm install --production
    
    echo "🔄 重启 PM2 服务..."
    pm2 restart ue-assets-backend
    
    echo "📋 查看服务状态..."
    pm2 status
    
    echo "📝 查看最新日志..."
    pm2 logs ue-assets-backend --lines 20 --nostream
EOF

echo ""
echo "✅ 后端部署完成！"
echo ""
echo "🔍 验证部署:"
echo "  curl https://api.your-domain.com/health"

