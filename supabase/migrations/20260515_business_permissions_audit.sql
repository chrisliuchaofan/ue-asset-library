-- Business permissions, permission requests, upload records, and audit logs.
-- Team roles stay in team_members. These tables only store action-level grants,
-- requests, upload history, and append-only audit events.

CREATE TABLE IF NOT EXISTS public.team_business_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  permission TEXT NOT NULL,
  granted_by_email TEXT NOT NULL,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT team_business_permissions_email_chk CHECK (position('@' in user_email) > 1),
  CONSTRAINT team_business_permissions_granted_by_email_chk CHECK (position('@' in granted_by_email) > 1),
  CONSTRAINT team_business_permissions_permission_chk CHECK (permission IN (
    'material:upload',
    'review:ai_precheck',
    'review:submit_manual',
    'review:score_art',
    'review:score_creative',
    'review:score_growth',
    'review:criteria:update',
    'review:manage',
    'user_records:read'
  )),
  CONSTRAINT team_business_permissions_unique UNIQUE (team_id, user_email, permission)
);

CREATE TABLE IF NOT EXISTS public.team_permission_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  permission TEXT NOT NULL,
  project TEXT,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  decided_by_email TEXT,
  decided_at TIMESTAMPTZ,
  decision_note TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT team_permission_requests_email_chk CHECK (position('@' in user_email) > 1),
  CONSTRAINT team_permission_requests_permission_chk CHECK (permission IN (
    'material:upload',
    'review:ai_precheck',
    'review:submit_manual',
    'review:score_art',
    'review:score_creative',
    'review:score_growth',
    'review:criteria:update',
    'review:manage',
    'user_records:read'
  )),
  CONSTRAINT team_permission_requests_status_chk CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_team_permission_requests_pending_unique
  ON public.team_permission_requests(team_id, user_email, permission, COALESCE(project, ''))
  WHERE status = 'pending';

CREATE TABLE IF NOT EXISTS public.user_upload_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  project TEXT NOT NULL,
  material_id UUID REFERENCES public.materials(id) ON DELETE SET NULL,
  material_version INTEGER NOT NULL DEFAULT 1,
  file_name TEXT,
  file_type TEXT,
  file_size BIGINT,
  file_hash TEXT,
  oss_key TEXT,
  file_url TEXT,
  upload_source TEXT NOT NULL DEFAULT 'material',
  review_status TEXT NOT NULL DEFAULT 'draft',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT user_upload_records_email_chk CHECK (position('@' in user_email) > 1),
  CONSTRAINT user_upload_records_version_chk CHECK (material_version > 0)
);

CREATE TABLE IF NOT EXISTS public.operation_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  actor_email TEXT NOT NULL,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  target_user_email TEXT,
  project TEXT,
  material_id UUID,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT operation_audit_logs_actor_email_chk CHECK (position('@' in actor_email) > 1)
);

CREATE INDEX IF NOT EXISTS idx_team_business_permissions_team_user
  ON public.team_business_permissions(team_id, user_email);
CREATE INDEX IF NOT EXISTS idx_team_business_permissions_permission
  ON public.team_business_permissions(permission);
CREATE INDEX IF NOT EXISTS idx_team_business_permissions_expires
  ON public.team_business_permissions(expires_at);

CREATE INDEX IF NOT EXISTS idx_team_permission_requests_team_status
  ON public.team_permission_requests(team_id, status, requested_at DESC);
CREATE INDEX IF NOT EXISTS idx_team_permission_requests_user
  ON public.team_permission_requests(team_id, user_email, requested_at DESC);
CREATE INDEX IF NOT EXISTS idx_team_permission_requests_permission
  ON public.team_permission_requests(permission);

CREATE INDEX IF NOT EXISTS idx_user_upload_records_team_user
  ON public.user_upload_records(team_id, user_email, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_upload_records_team_project
  ON public.user_upload_records(team_id, project, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_upload_records_material
  ON public.user_upload_records(material_id);
CREATE INDEX IF NOT EXISTS idx_user_upload_records_review_status
  ON public.user_upload_records(review_status);

CREATE INDEX IF NOT EXISTS idx_operation_audit_logs_team_created
  ON public.operation_audit_logs(team_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_operation_audit_logs_actor
  ON public.operation_audit_logs(actor_email, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_operation_audit_logs_action
  ON public.operation_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_operation_audit_logs_target
  ON public.operation_audit_logs(target_type, target_id);

CREATE OR REPLACE FUNCTION public.update_business_permission_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_team_business_permissions_updated_at ON public.team_business_permissions;
CREATE TRIGGER trg_team_business_permissions_updated_at
BEFORE UPDATE ON public.team_business_permissions
FOR EACH ROW
EXECUTE FUNCTION public.update_business_permission_updated_at();

DROP TRIGGER IF EXISTS trg_team_permission_requests_updated_at ON public.team_permission_requests;
CREATE TRIGGER trg_team_permission_requests_updated_at
BEFORE UPDATE ON public.team_permission_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_business_permission_updated_at();

DROP TRIGGER IF EXISTS trg_user_upload_records_updated_at ON public.user_upload_records;
CREATE TRIGGER trg_user_upload_records_updated_at
BEFORE UPDATE ON public.user_upload_records
FOR EACH ROW
EXECUTE FUNCTION public.update_business_permission_updated_at();

ALTER TABLE public.team_business_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_permission_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_upload_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operation_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "team_business_permissions_team_members_select"
ON public.team_business_permissions FOR SELECT
USING (
  team_id IN (
    SELECT tm.team_id FROM public.team_members tm WHERE tm.user_id = current_setting('app.current_user_id', true)
  )
);

CREATE POLICY "team_permission_requests_team_members_select"
ON public.team_permission_requests FOR SELECT
USING (
  team_id IN (
    SELECT tm.team_id FROM public.team_members tm WHERE tm.user_id = current_setting('app.current_user_id', true)
  )
);

CREATE POLICY "user_upload_records_owner_or_manager_select"
ON public.user_upload_records FOR SELECT
USING (
  user_email = current_setting('app.current_user_id', true)
  OR team_id IN (
    SELECT tm.team_id FROM public.team_members tm
    WHERE tm.user_id = current_setting('app.current_user_id', true)
      AND tm.role IN ('owner', 'admin')
  )
);

CREATE POLICY "operation_audit_logs_team_admin_select"
ON public.operation_audit_logs FOR SELECT
USING (
  team_id IN (
    SELECT tm.team_id FROM public.team_members tm
    WHERE tm.user_id = current_setting('app.current_user_id', true)
      AND tm.role IN ('owner', 'admin')
  )
);

COMMENT ON TABLE public.team_business_permissions IS 'Action-level business permission grants. Team roles remain in team_members.';
COMMENT ON TABLE public.team_permission_requests IS 'User requests for action-level business permissions.';
COMMENT ON TABLE public.user_upload_records IS 'Per-user material upload history with material and review state references.';
COMMENT ON TABLE public.operation_audit_logs IS 'Append-only business operation audit events with sanitized metadata.';
