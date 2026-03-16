-- Create material_reviews table for S3 AI Review Center
CREATE TABLE IF NOT EXISTS material_reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  material_id TEXT NOT NULL, -- Ties to materials.json items
  
  -- Overall Status
  overall_status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'passed', 'failed', 'pending_human'
  ai_rationale TEXT,
  
  -- Dimension 1: Duration
  score_duration_pass BOOLEAN,
  score_duration_rationale TEXT,
  
  -- Dimension 2: 3-Second Hook
  score_hook_pass BOOLEAN,
  score_hook_rationale TEXT,
  
  -- Dimension 3: CTA Check
  score_cta_pass BOOLEAN,
  score_cta_rationale TEXT,

  -- Optional human review override
  human_reviewed_by UUID REFERENCES auth.users(id),
  human_override_status TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast lookup by material_id
CREATE INDEX IF NOT EXISTS idx_material_reviews_material_id ON material_reviews(material_id);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_material_reviews_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_material_reviews_updated_at ON material_reviews;
CREATE TRIGGER trg_material_reviews_updated_at
BEFORE UPDATE ON material_reviews
FOR EACH ROW
EXECUTE FUNCTION update_material_reviews_updated_at();

-- RLS policies (allow both anon and authenticated for MVP)
ALTER TABLE material_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all users to read reviews"
ON material_reviews FOR SELECT
USING (true);

CREATE POLICY "Allow all users to insert reviews"
ON material_reviews FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow all users to update reviews"
ON material_reviews FOR UPDATE
USING (true);
