#!/bin/bash

echo "🔍 检查数据库配置状态"
echo "=================================================="
echo ""

cd "$(dirname "$0")/backend-api"

if [ ! -f .env ]; then
  echo "❌ .env 文件不存在"
  exit 1
fi

echo "📋 当前数据库配置："
echo ""

DB_HOST=$(grep "^DB_HOST=" .env | cut -d'=' -f2)
DB_PORT=$(grep "^DB_PORT=" .env | cut -d'=' -f2)
DB_USERNAME=$(grep "^DB_USERNAME=" .env | cut -d'=' -f2)
DB_PASSWORD=$(grep "^DB_PASSWORD=" .env | cut -d'=' -f2)
DB_NAME=$(grep "^DB_NAME=" .env | cut -d'=' -f2)

echo "  DB_HOST: $DB_HOST"
echo "  DB_PORT: $DB_PORT"
echo "  DB_USERNAME: $DB_USERNAME"
echo "  DB_PASSWORD: $(if [ "$DB_PASSWORD" = "your-db-password" ]; then echo "❌ 未配置（默认值）"; else echo "✅ 已配置"; fi)"
echo "  DB_NAME: $DB_NAME"
echo ""

# 检查是否是默认值
if [ "$DB_USERNAME" = "your-db-username" ] || [ "$DB_PASSWORD" = "your-db-password" ]; then
  echo "⚠️  数据库配置未完成！"
  echo ""
  echo "请编辑 backend-api/.env 文件，填写实际的数据库信息："
  echo "  DB_HOST=your-database-host"
  echo "  DB_USERNAME=your-db-username"
  echo "  DB_PASSWORD=your-db-password"
  echo ""
  echo "如果数据库在服务器上，请填写服务器的数据库信息。"
  exit 1
else
  echo "✅ 数据库配置已填写（请确认信息正确）"
  echo ""
  echo "💡 测试数据库连接："
  echo "  cd backend-api"
  echo "  npm run start:dev"
  echo "  查看日志，确认数据库连接成功"
fi

