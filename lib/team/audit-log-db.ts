import { supabaseAdmin } from '@/lib/supabase/admin';
import type { Json } from '@/lib/supabase/types';

const SENSITIVE_KEY_RE = /token|secret|signature|authorization|cookie|password|policy|accesskey|credential/i;
const URL_KEY_RE = /url|href|link/i;

export interface AuditLogInput {
  teamId?: string | null;
  actorEmail: string;
  action: string;
  targetType?: string | null;
  targetId?: string | null;
  targetUserEmail?: string | null;
  project?: string | null;
  materialId?: string | null;
  metadata?: Record<string, unknown> | null;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function sanitizeUrl(value: string): string {
  try {
    const url = new URL(value);
    return `${url.origin}${url.pathname}`;
  } catch {
    return value;
  }
}

export function sanitizeAuditMetadata(value: unknown): Json {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') return sanitizeUrl(value);
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (Array.isArray(value)) return value.map((item) => sanitizeAuditMetadata(item)) as Json[];
  if (typeof value !== 'object') return null;

  const output: Record<string, Json> = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (SENSITIVE_KEY_RE.test(key)) continue;
    if (typeof raw === 'string' && URL_KEY_RE.test(key)) {
      output[key] = sanitizeUrl(raw);
      continue;
    }
    output[key] = sanitizeAuditMetadata(raw);
  }
  return output;
}

export async function createAuditLog(input: AuditLogInput): Promise<void> {
  const { error } = await (supabaseAdmin.from('operation_audit_logs') as any)
    .insert({
      team_id: input.teamId ?? null,
      actor_email: normalizeEmail(input.actorEmail),
      action: input.action,
      target_type: input.targetType ?? null,
      target_id: input.targetId ?? null,
      target_user_email: input.targetUserEmail ? normalizeEmail(input.targetUserEmail) : null,
      project: input.project ?? null,
      material_id: input.materialId ?? null,
      metadata: sanitizeAuditMetadata(input.metadata ?? {}),
    });

  if (error) {
    console.error('[AuditLog] Failed to write audit log:', error);
  }
}

export async function listAuditLogs(options: {
  teamId: string;
  action?: string;
  actorEmail?: string;
  limit?: number;
}) {
  let query = (supabaseAdmin.from('operation_audit_logs') as any)
    .select('*')
    .eq('team_id', options.teamId)
    .order('created_at', { ascending: false })
    .limit(options.limit || 100);

  if (options.action) query = query.eq('action', options.action);
  if (options.actorEmail) query = query.eq('actor_email', normalizeEmail(options.actorEmail));

  const { data, error } = await query;
  if (error) {
    throw new Error(`Failed to list audit logs: ${error.message}`);
  }

  return data || [];
}
