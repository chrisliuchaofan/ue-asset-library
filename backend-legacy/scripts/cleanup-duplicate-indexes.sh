#!/bin/bash

# 清理 redeem_codes 表的重复索引

echo "=== 清理重复索引 ==="
echo ""

CONTAINER_NAME="ue-assets-db"

if ! docker ps | grep -q "$CONTAINER_NAME"; then
    echo "❌ 数据库容器未运行"
    exit 1
fi

echo "正在清理重复的唯一索引..."
docker exec -i "$CONTAINER_NAME" psql -U ue_user -d ue_assets <<EOF
-- 删除所有与 code 列相关的唯一索引（除了主键）
DO \$\$
DECLARE
    idx_record RECORD;
BEGIN
    FOR idx_record IN
        SELECT indexname
        FROM pg_indexes
        WHERE tablename = 'redeem_codes'
          AND indexname != 'PK_fc9dfa78a09d93887edf0596cff'  -- 保留主键索引
          AND (indexdef LIKE '%code%' OR indexname LIKE '%code%')
          AND indexdef LIKE '%UNIQUE%'
    LOOP
        EXECUTE 'DROP INDEX IF EXISTS ' || quote_ident(idx_record.indexname);
        RAISE NOTICE '已删除索引: %', idx_record.indexname;
    END LOOP;
END \$\$;

-- 删除可能存在的重复约束（先删除约束，索引会自动删除）
ALTER TABLE redeem_codes DROP CONSTRAINT IF EXISTS "UQ_0953500f2b3c5ac1ff815e9f62d";
ALTER TABLE redeem_codes DROP CONSTRAINT IF EXISTS UQ_redeem_codes_code;

-- 添加单一的唯一约束
DO \$\$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'UQ_redeem_codes_code'
    ) THEN
        ALTER TABLE redeem_codes ADD CONSTRAINT UQ_redeem_codes_code UNIQUE (code);
        RAISE NOTICE '已添加唯一约束: UQ_redeem_codes_code';
    END IF;
END \$\$;

-- 显示最终结果
SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'redeem_codes'
ORDER BY indexname;
EOF

echo ""
echo "✅ 清理完成！"

