import { supabaseAdmin } from '@/lib/supabase/admin';
import type { BusinessPermission } from './business-permissions';
import { isBusinessPermission, normalizeEmail } from './business-permissions';

export type PermissionRequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export interface PermissionRequestRecord {
  id: string;
  team_id: string;
  user_email: string;
  permission: BusinessPermission;
  project: string | null;
  reason: string | null;
  status: PermissionRequestStatus;
  requested_at: string;
  decided_by_email: string | null;
  decided_at: string | null;
  decision_note: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface CreatePermissionRequestInput {
  teamId: string;
  userEmail: string;
  permission: BusinessPermission;
  project?: string | null;
  reason?: string | null;
  metadata?: Record<string, unknown>;
}

export interface ListPermissionRequestsOptions {
  teamId: string;
  userEmail?: string;
  status?: PermissionRequestStatus;
}

export async function listPermissionRequests(
  options: ListPermissionRequestsOptions
): Promise<PermissionRequestRecord[]> {
  let query = (supabaseAdmin.from('team_permission_requests') as any)
    .select('*')
    .eq('team_id', options.teamId)
    .order('requested_at', { ascending: false });

  if (options.userEmail) query = query.eq('user_email', normalizeEmail(options.userEmail));
  if (options.status) query = query.eq('status', options.status);

  const { data, error } = await query;
  if (error) {
    throw new Error(`Failed to list permission requests: ${error.message}`);
  }

  return ((data || []) as PermissionRequestRecord[]).filter((row) => isBusinessPermission(row.permission));
}

export async function createPermissionRequest(
  input: CreatePermissionRequestInput
): Promise<PermissionRequestRecord> {
  const { data, error } = await (supabaseAdmin.from('team_permission_requests') as any)
    .insert({
      team_id: input.teamId,
      user_email: normalizeEmail(input.userEmail),
      permission: input.permission,
      project: input.project || null,
      reason: input.reason?.trim() || null,
      metadata: input.metadata || {},
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new Error('A pending request for this permission already exists.');
    }
    throw new Error(`Failed to create permission request: ${error.message}`);
  }

  return data as PermissionRequestRecord;
}

export async function decidePermissionRequest(input: {
  id: string;
  teamId: string;
  status: Extract<PermissionRequestStatus, 'approved' | 'rejected'>;
  decidedByEmail: string;
  decisionNote?: string | null;
}): Promise<PermissionRequestRecord> {
  const { data, error } = await (supabaseAdmin.from('team_permission_requests') as any)
    .update({
      status: input.status,
      decided_by_email: normalizeEmail(input.decidedByEmail),
      decided_at: new Date().toISOString(),
      decision_note: input.decisionNote?.trim() || null,
    })
    .eq('id', input.id)
    .eq('team_id', input.teamId)
    .eq('status', 'pending')
    .select()
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to update permission request: ${error.message}`);
  }
  if (!data) {
    throw new Error('Permission request not found or already decided.');
  }

  return data as PermissionRequestRecord;
}
