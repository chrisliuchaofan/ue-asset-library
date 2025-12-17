#!/bin/bash

# 修复数据库索引问题的脚本

echo "=== 修复数据库索引问题 ==="
echo ""

# 检查数据库连接配置
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-ue_assets}"
DB_USERNAME="${DB_USERNAME:-ue_user}"

echo "数据库配置："
echo "  Host: $DB_HOST"
echo "  Port: $DB_PORT"
echo "  Database: $DB_NAME"
echo "  Username: $DB_USERNAME"
echo ""

# 检查 psql 是否可用
if ! command -v psql &> /dev/null; then
    echo "⚠️  psql 命令不可用，请手动执行以下 SQL："
    echo ""
    echo "1. 连接到数据库："
    echo "   psql -h $DB_HOST -p $DB_PORT -U $DB_USERNAME -d $DB_NAME"
    echo ""
    echo "2. 执行以下 SQL："
    echo "   DROP INDEX IF EXISTS \"IDX_0953500f2b3c5ac1ff815e9f62\";"
    echo ""
    echo "或者执行完整的修复脚本："
    echo "   psql -h $DB_HOST -p $DB_PORT -U $DB_USERNAME -d $DB_NAME -f scripts/fix-redeem-code-index.sql"
    echo ""
    exit 1
fi

# 执行 SQL 脚本
echo "正在执行修复脚本..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USERNAME" -d "$DB_NAME" -f "$(dirname "$0")/fix-redeem-code-index.sql"

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ 数据库索引修复完成！"
    echo "现在可以重新启动后端服务了。"
else
    echo ""
    echo "❌ 修复失败，请检查数据库连接配置和权限。"
    exit 1
fi







