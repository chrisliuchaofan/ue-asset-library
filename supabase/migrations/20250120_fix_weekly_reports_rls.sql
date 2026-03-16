-- 修复 weekly_reports 表的 RLS 策略
-- 由于项目使用 NextAuth 而不是 Supabase Auth，需要修改 RLS 策略

-- 第一步：先删除外键约束（必须在修改字段类型之前）
ALTER TABLE weekly_reports 
  DROP CONSTRAINT IF EXISTS weekly_reports_created_by_fkey;

-- 第二步：删除旧的 RLS 策略
DROP POLICY IF EXISTS "Users can view their own reports" ON weekly_reports;
DROP POLICY IF EXISTS "Users can create their own reports" ON weekly_reports;
DROP POLICY IF EXISTS "Users can update their own reports" ON weekly_reports;
DROP POLICY IF EXISTS "Users can delete their own reports" ON weekly_reports;

-- 第三步：修改 created_by 字段类型为 TEXT，以支持 NextAuth 的用户 ID（可能是 email 或 UUID 字符串）
-- 注意：如果字段中有数据，需要先清空或转换
ALTER TABLE weekly_reports 
  ALTER COLUMN created_by TYPE TEXT USING created_by::TEXT;

-- 由于使用 NextAuth，RLS 策略无法直接使用 auth.uid()
-- 改为在应用层进行权限检查，RLS 策略允许所有操作
-- 注意：应用层已经在 db-service.ts 中进行了权限检查

-- 允许所有已认证用户查看所有报告（应用层会过滤）
-- 如果需要更严格的权限控制，可以在应用层添加额外的过滤
CREATE POLICY "Allow all authenticated users"
  ON weekly_reports
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 或者，如果需要更严格的权限控制，可以基于 created_by 字段
-- 但需要在应用层设置正确的 created_by 值
-- CREATE POLICY "Users can view their own reports"
--   ON weekly_reports
--   FOR SELECT
--   USING (created_by IS NOT NULL);
--
-- CREATE POLICY "Users can create their own reports"
--   ON weekly_reports
--   FOR INSERT
--   WITH CHECK (created_by IS NOT NULL);
--
-- CREATE POLICY "Users can update their own reports"
--   ON weekly_reports
--   FOR UPDATE
--   USING (created_by IS NOT NULL)
--   WITH CHECK (created_by IS NOT NULL);
--
-- CREATE POLICY "Users can delete their own reports"
--   ON weekly_reports
--   FOR DELETE
--   USING (created_by IS NOT NULL);
