import { supabaseAdmin } from '@/lib/supabase/admin';
import { sanitizeAuditMetadata } from './audit-log-db';
import { normalizeEmail } from './business-permissions';

export interface UploadRecordInput {
  teamId: string;
  userEmail: string;
  project: string;
  materialId?: string | null;
  materialVersion?: number;
  fileName?: string | null;
  fileType?: string | null;
  fileSize?: number | null;
  fileHash?: string | null;
  ossKey?: string | null;
  fileUrl?: string | null;
  uploadSource?: string;
  reviewStatus?: string;
  metadata?: Record<string, unknown>;
}

export interface ListUploadRecordsOptions {
  teamId: string;
  userEmail?: string;
  limit?: number;
}

export async function createUploadRecord(input: UploadRecordInput) {
  const { data, error } = await (supabaseAdmin.from('user_upload_records') as any)
    .insert({
      team_id: input.teamId,
      user_email: normalizeEmail(input.userEmail),
      project: input.project,
      material_id: input.materialId || null,
      material_version: input.materialVersion || 1,
      file_name: input.fileName || null,
      file_type: input.fileType || null,
      file_size: input.fileSize ?? null,
      file_hash: input.fileHash || null,
      oss_key: input.ossKey || null,
      file_url: input.fileUrl || null,
      upload_source: input.uploadSource || 'material',
      review_status: input.reviewStatus || 'draft',
      metadata: sanitizeAuditMetadata(input.metadata || {}),
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create upload record: ${error.message}`);
  }

  return data;
}

export async function listUploadRecords(options: ListUploadRecordsOptions) {
  let query = (supabaseAdmin.from('user_upload_records') as any)
    .select('*')
    .eq('team_id', options.teamId)
    .order('created_at', { ascending: false })
    .limit(options.limit || 100);

  if (options.userEmail) query = query.eq('user_email', normalizeEmail(options.userEmail));

  const { data, error } = await query;
  if (error) {
    throw new Error(`Failed to list upload records: ${error.message}`);
  }

  return data || [];
}
