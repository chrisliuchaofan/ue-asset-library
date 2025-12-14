#!/bin/bash

# PostgreSQL 数据库设置脚本
# 在服务器上执行：sudo bash setup-database.sh

set -e

echo "🚀 开始设置 PostgreSQL 数据库..."

# 检查是否以 root 运行
if [ "$EUID" -ne 0 ]; then 
    echo "❌ 请使用 sudo 运行此脚本"
    exit 1
fi

# 1. 安装 PostgreSQL
echo "📦 安装 PostgreSQL..."
apt update
apt install -y postgresql postgresql-contrib

# 2. 启动 PostgreSQL 服务
echo "🔄 启动 PostgreSQL 服务..."
systemctl start postgresql
systemctl enable postgresql

# 3. 创建数据库和用户
echo "📝 创建数据库和用户..."

# 从环境变量读取配置，或使用默认值
DB_NAME=${DB_NAME:-ue_assets}
DB_USER=${DB_USER:-ue_assets_user}
DB_PASSWORD=${DB_PASSWORD:-$(openssl rand -base64 32)}

# 切换到 postgres 用户执行 SQL
sudo -u postgres psql <<EOF
-- 创建数据库
CREATE DATABASE ${DB_NAME};

-- 创建用户
CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASSWORD}';

-- 授予权限
GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};

-- 连接到数据库并授予 schema 权限
\c ${DB_NAME}
GRANT ALL ON SCHEMA public TO ${DB_USER};
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO ${DB_USER};
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO ${DB_USER};

\q
EOF

echo ""
echo "✅ 数据库设置完成！"
echo ""
echo "📋 数据库信息："
echo "  数据库名: ${DB_NAME}"
echo "  用户名: ${DB_USER}"
echo "  密码: ${DB_PASSWORD}"
echo ""
echo "⚠️  请将以下内容添加到 /opt/ue-assets-backend/backend-api/.env 文件："
echo ""
echo "DB_HOST=localhost"
echo "DB_PORT=5432"
echo "DB_NAME=${DB_NAME}"
echo "DB_USERNAME=${DB_USER}"
echo "DB_PASSWORD=${DB_PASSWORD}"
echo ""
echo "然后重启后端服务：pm2 restart ue-assets-backend"

