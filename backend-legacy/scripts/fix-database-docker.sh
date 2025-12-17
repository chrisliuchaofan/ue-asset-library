#!/bin/bash

# 通过 Docker 修复数据库索引问题的脚本

echo "=== 通过 Docker 修复数据库索引问题 ==="
echo ""

# 检查 Docker 是否可用
if ! command -v docker &> /dev/null; then
    echo "❌ Docker 未安装或不可用"
    echo ""
    echo "请使用其他方法修复数据库："
    echo "1. 安装 PostgreSQL 客户端工具（psql）"
    echo "2. 使用数据库管理工具（如 pgAdmin、DBeaver）"
    echo "3. 临时禁用 synchronize（见下方说明）"
    exit 1
fi

# 检查数据库容器是否运行
CONTAINER_NAME="ue-assets-db"
if ! docker ps | grep -q "$CONTAINER_NAME"; then
    echo "⚠️  数据库容器 '$CONTAINER_NAME' 未运行"
    echo ""
    echo "尝试启动容器..."
    if docker ps -a | grep -q "$CONTAINER_NAME"; then
        docker start "$CONTAINER_NAME"
        echo "⏳ 等待容器启动（3秒）..."
        sleep 3
    else
        echo "❌ 容器不存在，请先运行数据库设置脚本："
        echo "   cd /Users/chrisl/Documents/恒星UE资产库/web"
        echo "   ./快速设置数据库.sh"
        exit 1
    fi
fi

echo "✅ 数据库容器运行中"
echo ""

# 执行 SQL 修复
echo "正在执行 SQL 修复..."
docker exec -i "$CONTAINER_NAME" psql -U ue_user -d ue_assets <<EOF
-- 删除重复的唯一索引
DROP INDEX IF EXISTS "IDX_0953500f2b3c5ac1ff815e9f62";

-- 检查并确保 code 列有唯一约束
DO \$\$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'UQ_redeem_codes_code'
    ) THEN
        ALTER TABLE redeem_codes ADD CONSTRAINT UQ_redeem_codes_code UNIQUE (code);
        RAISE NOTICE '已添加唯一约束: UQ_redeem_codes_code';
    ELSE
        RAISE NOTICE '唯一约束已存在: UQ_redeem_codes_code';
    END IF;
END \$\$;

-- 显示修复结果
SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'redeem_codes'
ORDER BY indexname;
EOF

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ 数据库索引修复完成！"
    echo "现在可以重新启动后端服务了。"
else
    echo ""
    echo "❌ 修复失败，请检查错误信息。"
    exit 1
fi







