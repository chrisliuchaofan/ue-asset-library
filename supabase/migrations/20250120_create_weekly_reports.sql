-- 创建周报表
-- 用于存储 Excel 转周报工具生成的报告数据

-- 创建 weekly_reports 表
CREATE TABLE IF NOT EXISTS weekly_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- 周报基本信息
  week_date_range TEXT NOT NULL, -- 周报日期范围，例如："2025-01-13 ~ 2025-01-19"
  week_start_date DATE NOT NULL, -- 周开始日期（用于查询和排序）
  week_end_date DATE NOT NULL, -- 周结束日期
  
  -- AI 生成的总结文本
  summary_text TEXT, -- AI 生成的周报总结文本
  
  -- 报告数据（JSONB 类型，存储分级后的素材数组）
  report_data JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  -- 元数据
  excel_file_name TEXT, -- 原始 Excel 文件名
  total_materials INTEGER DEFAULT 0, -- 总素材数
  total_consumption DECIMAL(12, 2) DEFAULT 0, -- 总消耗（如果有）
  
  -- 创建者信息（关联到 profiles 表）
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- 索引
  CONSTRAINT valid_date_range CHECK (week_end_date >= week_start_date)
);

-- 创建索引以优化查询性能
CREATE INDEX IF NOT EXISTS idx_weekly_reports_week_start_date ON weekly_reports(week_start_date DESC);
CREATE INDEX IF NOT EXISTS idx_weekly_reports_created_at ON weekly_reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_weekly_reports_created_by ON weekly_reports(created_by);
CREATE INDEX IF NOT EXISTS idx_weekly_reports_report_data ON weekly_reports USING GIN(report_data); -- GIN 索引用于 JSONB 查询

-- 创建更新时间触发器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_weekly_reports_updated_at
  BEFORE UPDATE ON weekly_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 启用 Row Level Security (RLS)
ALTER TABLE weekly_reports ENABLE ROW LEVEL SECURITY;

-- RLS 策略：用户可以查看自己创建的报告
CREATE POLICY "Users can view their own reports"
  ON weekly_reports
  FOR SELECT
  USING (auth.uid() = created_by);

-- RLS 策略：用户可以创建自己的报告
CREATE POLICY "Users can create their own reports"
  ON weekly_reports
  FOR INSERT
  WITH CHECK (auth.uid() = created_by);

-- RLS 策略：用户可以更新自己创建的报告
CREATE POLICY "Users can update their own reports"
  ON weekly_reports
  FOR UPDATE
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

-- RLS 策略：用户可以删除自己创建的报告
CREATE POLICY "Users can delete their own reports"
  ON weekly_reports
  FOR DELETE
  USING (auth.uid() = created_by);

-- 管理员可以查看所有报告（如果需要）
-- 注意：需要确保 profiles 表有 is_admin 字段
-- CREATE POLICY "Admins can view all reports"
--   ON weekly_reports
--   FOR SELECT
--   USING (
--     EXISTS (
--       SELECT 1 FROM profiles
--       WHERE profiles.id = auth.uid() AND profiles.is_admin = true
--     )
--   );

-- 添加注释
COMMENT ON TABLE weekly_reports IS '周报数据表，存储 Excel 转周报工具生成的报告';
COMMENT ON COLUMN weekly_reports.week_date_range IS '周报日期范围文本，例如："2025-01-13 ~ 2025-01-19"';
COMMENT ON COLUMN weekly_reports.week_start_date IS '周开始日期（用于查询和排序）';
COMMENT ON COLUMN weekly_reports.week_end_date IS '周结束日期';
COMMENT ON COLUMN weekly_reports.summary_text IS 'AI 生成的周报总结文本';
COMMENT ON COLUMN weekly_reports.report_data IS '报告数据（JSONB），存储分级后的素材数组';
COMMENT ON COLUMN weekly_reports.excel_file_name IS '原始 Excel 文件名';
COMMENT ON COLUMN weekly_reports.total_materials IS '总素材数';
COMMENT ON COLUMN weekly_reports.total_consumption IS '总消耗（如果有）';
