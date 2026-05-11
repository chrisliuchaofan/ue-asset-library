-- 2026-05-09: 模版 - 素材关系表
-- 用于表达一个爆款模版与素材之间的业务关系：
-- source = 来源爆款素材，replica = 复刻素材，competitor_reference = 竞品参考。

CREATE TABLE IF NOT EXISTS template_material_relations (
  id TEXT DEFAULT gen_random_uuid()::TEXT PRIMARY KEY,
  template_id TEXT NOT NULL REFERENCES material_templates(id) ON DELETE CASCADE,
  material_id UUID NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
  relation_type TEXT NOT NULL CHECK (
    relation_type IN ('source', 'replica', 'competitor_reference')
  ),
  note TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(template_id, material_id, relation_type)
);

CREATE INDEX IF NOT EXISTS idx_template_material_relations_template
ON template_material_relations(template_id);

CREATE INDEX IF NOT EXISTS idx_template_material_relations_material
ON template_material_relations(material_id);

CREATE INDEX IF NOT EXISTS idx_template_material_relations_type
ON template_material_relations(relation_type);

CREATE OR REPLACE FUNCTION update_template_material_relations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_template_material_relations_updated_at
ON template_material_relations;

CREATE TRIGGER trg_template_material_relations_updated_at
BEFORE UPDATE ON template_material_relations
FOR EACH ROW
EXECUTE FUNCTION update_template_material_relations_updated_at();

ALTER TABLE template_material_relations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "template_material_relations_select_policy"
ON template_material_relations FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM material_templates t
    WHERE t.id = template_material_relations.template_id
      AND (
        t.team_id IS NULL
        OR t.team_id IN (
          SELECT tm.team_id FROM team_members tm WHERE tm.user_id = auth.uid()::TEXT
        )
      )
  )
);

CREATE POLICY "template_material_relations_insert_policy"
ON template_material_relations FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM material_templates t
    WHERE t.id = template_material_relations.template_id
      AND (
        t.user_id = auth.uid()::TEXT
        OR t.team_id IN (
          SELECT tm.team_id FROM team_members tm WHERE tm.user_id = auth.uid()::TEXT
        )
      )
  )
  AND EXISTS (
    SELECT 1
    FROM materials m
    WHERE m.id = template_material_relations.material_id
      AND (
        m.team_id IS NULL
        OR m.team_id IN (
          SELECT tm.team_id FROM team_members tm WHERE tm.user_id = auth.uid()::TEXT
        )
      )
  )
);

CREATE POLICY "template_material_relations_update_policy"
ON template_material_relations FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM material_templates t
    WHERE t.id = template_material_relations.template_id
      AND (
        t.user_id = auth.uid()::TEXT
        OR t.team_id IN (
          SELECT tm.team_id FROM team_members tm WHERE tm.user_id = auth.uid()::TEXT
        )
      )
  )
);

CREATE POLICY "template_material_relations_delete_policy"
ON template_material_relations FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM material_templates t
    WHERE t.id = template_material_relations.template_id
      AND (
        t.user_id = auth.uid()::TEXT
        OR t.team_id IN (
          SELECT tm.team_id FROM team_members tm WHERE tm.user_id = auth.uid()::TEXT
        )
      )
  )
);
