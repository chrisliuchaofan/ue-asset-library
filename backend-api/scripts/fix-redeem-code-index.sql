-- 修复 redeem_codes 表的重复索引问题
-- 删除可能存在的重复索引

-- 删除旧的唯一索引（如果存在）
DROP INDEX IF EXISTS "IDX_0953500f2b3c5ac1ff815e9f62";

-- 检查并删除其他可能的重复索引
DO $$
DECLARE
    idx_record RECORD;
BEGIN
    -- 查找所有与 code 列相关的唯一索引
    FOR idx_record IN
        SELECT indexname
        FROM pg_indexes
        WHERE tablename = 'redeem_codes'
          AND indexdef LIKE '%code%'
          AND indexdef LIKE '%UNIQUE%'
    LOOP
        EXECUTE 'DROP INDEX IF EXISTS ' || quote_ident(idx_record.indexname);
        RAISE NOTICE '已删除索引: %', idx_record.indexname;
    END LOOP;
END $$;

-- 确保 code 列有唯一约束（通过列定义）
-- 如果表已存在，添加唯一约束（如果不存在）
DO $$
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
END $$;


