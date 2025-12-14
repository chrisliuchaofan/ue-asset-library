#!/bin/bash

# Nginx 后端配置脚本
# 使用方法：在服务器上执行 bash setup-nginx-backend.sh

set -e

echo "🚀 开始配置 Nginx 反向代理..."

# 检查是否以 root 运行
if [ "$EUID" -ne 0 ]; then 
    echo "❌ 请使用 sudo 运行此脚本"
    exit 1
fi

# 1. 创建 Nginx 配置文件
echo "📝 创建 Nginx 配置文件..."
cat > /etc/nginx/sites-available/ue-assets-backend << 'EOF'
server {
    listen 80 default_server;
    server_name _;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

# 2. 检查并移除其他 default_server 配置
echo "🔍 检查现有 default_server 配置..."
for file in /etc/nginx/sites-enabled/*; do
    if [ -f "$file" ] && grep -q "default_server" "$file"; then
        echo "⚠️  发现 default_server 配置: $file"
        # 移除 default_server 关键字
        sed -i 's/listen.*default_server/listen 80/g' "$file" 2>/dev/null || true
        echo "✅ 已移除 $file 中的 default_server"
    fi
done

# 3. 禁用默认配置（如果存在）
if [ -f /etc/nginx/sites-enabled/default ]; then
    echo "⚠️  禁用默认 Nginx 配置..."
    # 先移除 default_server
    sed -i 's/listen.*default_server/listen 80/g' /etc/nginx/sites-enabled/default 2>/dev/null || true
    mv /etc/nginx/sites-enabled/default /etc/nginx/sites-enabled/default.bak
fi

# 4. 创建软链接
echo "🔗 创建软链接..."
if [ -L /etc/nginx/sites-enabled/ue-assets-backend ]; then
    rm /etc/nginx/sites-enabled/ue-assets-backend
fi
ln -s /etc/nginx/sites-available/ue-assets-backend /etc/nginx/sites-enabled/

# 4. 测试配置
echo "🧪 测试 Nginx 配置..."
if nginx -t; then
    echo "✅ Nginx 配置测试通过"
else
    echo "❌ Nginx 配置测试失败"
    exit 1
fi

# 5. 重新加载 Nginx
echo "🔄 重新加载 Nginx..."
systemctl reload nginx

# 6. 测试后端连接
echo "🧪 测试后端连接..."
sleep 1
if curl -s http://localhost/health | grep -q "status"; then
    echo "✅ 后端服务连接成功！"
    curl http://localhost/health
else
    echo "⚠️  后端服务连接失败，请检查后端是否运行：pm2 status"
fi

echo ""
echo "🎉 Nginx 配置完成！"
echo ""
echo "📋 下一步："
echo "1. 等待 DNS 解析生效（api.factory-buy.com）"
echo "2. 配置 SSL 证书：sudo certbot --nginx -d api.factory-buy.com"
echo "3. 在 Vercel 添加环境变量：BACKEND_API_URL=https://api.factory-buy.com"

