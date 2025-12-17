#!/bin/bash

# 数据库迁移脚本
# 用途：为 User 实体添加 billingMode 和 modelMode 字段

set -e

# 颜色输出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 开始数据库迁移...${NC}"
echo ""

# 检查环境变量
if [ -z "$DB_HOST" ] || [ -z "$DB_USERNAME" ] || [ -z "$DB_PASSWORD" ] || [ -z "$DB_NAME" ]; then
  echo -e "${RED}❌ 错误：数据库环境变量未配置${NC}"
  echo "请设置以下环境变量："
  echo "  - DB_HOST"
  echo "  - DB_USERNAME"
  echo "  - DB_PASSWORD"
  echo "  - DB_NAME"
  exit 1
fi

# 加载 .env 文件（如果存在）
if [ -f .env ]; then
  echo -e "${YELLOW}📋 从 .env 文件加载环境变量...${NC}"
  export $(cat .env | grep -v '^#' | xargs)
fi

# 执行迁移
echo -e "${GREEN}📝 执行迁移 SQL...${NC}"
PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "${DB_PORT:-5432}" -U "$DB_USERNAME" -d "$DB_NAME" -f src/database/migrations/add-user-mode-fields.sql

if [ $? -eq 0 ]; then
  echo ""
  echo -e "${GREEN}✅ 迁移成功！${NC}"
  echo ""
  echo "验证："
  PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "${DB_PORT:-5432}" -U "$DB_USERNAME" -d "$DB_NAME" -c "
    SELECT 
      column_name, 
      data_type, 
      column_default
    FROM information_schema.columns 
    WHERE table_name = 'users' 
      AND column_name IN ('billingMode', 'modelMode');
  "
else
  echo ""
  echo -e "${RED}❌ 迁移失败！${NC}"
  exit 1
fi







