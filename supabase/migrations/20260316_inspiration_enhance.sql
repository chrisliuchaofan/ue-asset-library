-- W3.3 灵感增强：状态流转 + 参考链接
ALTER TABLE inspirations ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'new';
ALTER TABLE inspirations ADD COLUMN IF NOT EXISTS reference_url TEXT;

-- 索引
CREATE INDEX IF NOT EXISTS idx_insp_status ON inspirations(status);
