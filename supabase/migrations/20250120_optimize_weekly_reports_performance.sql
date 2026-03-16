-- 优化 weekly_reports 表的性能
-- 如果 GIN 索引导致插入性能问题，可以考虑延迟创建或优化

-- 方案 1：如果 GIN 索引导致插入慢，可以先删除，在查询时再创建
-- 注意：GIN 索引对 JSONB 查询很有用，但如果数据量很大，插入时会有性能开销
-- 如果插入频繁但查询不频繁，可以考虑延迟创建索引

-- 检查当前索引
-- SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'weekly_reports';

-- 如果插入性能有问题，可以暂时删除 GIN 索引（查询性能会下降，但插入会更快）
-- DROP INDEX IF EXISTS idx_weekly_reports_report_data;

-- 或者，如果数据量很大，可以考虑：
-- 1. 延迟创建索引（在数据插入后创建）
-- 2. 使用 CONCURRENTLY 创建索引（不阻塞表操作）
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_weekly_reports_report_data 
--   ON weekly_reports USING GIN(report_data);

-- 方案 2：优化插入性能 - 确保 created_by 字段有索引（已存在）
-- 方案 3：如果 report_data 太大，可以考虑压缩或分页存储

-- 当前建议：保持现有索引，但如果插入超时，可以临时删除 GIN 索引测试
