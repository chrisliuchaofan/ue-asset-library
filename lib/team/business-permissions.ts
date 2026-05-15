import { NextResponse } from 'next/server';
import { getAllowedProjectsForEmail, isProjectAllowed } from '@/lib/project-permissions';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireAuth, isErrorResponse } from './require-team';
import { getMemberRole } from './team-service';
import { hasPermission } from './types';
import type { AuthenticatedContext, TeamRole, Permission as TeamPermission } from './types';

export type BusinessPermission =
  | 'material:upload'
  | 'review:ai_precheck'
  | 'review:submit_manual'
  | 'review:score_art'
  | 'review:score_creative'
  | 'review:score_growth'
  | 'review:criteria:update'
  | 'review:manage'
  | 'user_records:read';

export const BUSINESS_PERMISSIONS: BusinessPermission[] = [
  'material:upload',
  'review:ai_precheck',
  'review:submit_manual',
  'review:score_art',
  'review:score_creative',
  'review:score_growth',
  'review:criteria:update',
  'review:manage',
  'user_records:read',
];

const BUSINESS_PERMISSION_SET = new Set<string>(BUSINESS_PERMISSIONS);

const DEFAULT_ROLE_BUSINESS_PERMISSIONS: Record<TeamRole, BusinessPermission[]> = {
  owner: [...BUSINESS_PERMISSIONS],
  admin: [...BUSINESS_PERMISSIONS],
  member: ['material:upload', 'review:ai_precheck', 'review:submit_manual'],
  viewer: [],
};

export interface BusinessPermissionContext extends AuthenticatedContext {
  role: TeamRole;
}

export interface RequireBusinessPermissionOptions {
  project?: string;
}

export function isBusinessPermission(value: unknown): value is BusinessPermission {
  return typeof value === 'string' && BUSINESS_PERMISSION_SET.has(value);
}

export function getDefaultBusinessPermissions(role: TeamRole): BusinessPermission[] {
  return DEFAULT_ROLE_BUSINESS_PERMISSIONS[role] ?? [];
}

export async function requireTeamRouteAccess(
  teamId: string,
  permission?: TeamPermission
): Promise<BusinessPermissionContext | NextResponse> {
  const auth = await requireAuth();
  if (isErrorResponse(auth)) return auth;

  const role = await getMemberRole(teamId, auth.userId);
  if (!role) {
    return NextResponse.json({ message: 'You are not a member of this team.' }, { status: 403 });
  }

  if (permission && !hasPermission(role as TeamRole, permission)) {
    return NextResponse.json({ message: 'Permission denied.' }, { status: 403 });
  }

  return {
    userId: auth.userId,
    email: auth.email,
    teamId,
    teamSlug: '',
    role: role as TeamRole,
  };
}

export async function getExplicitBusinessPermissions(
  teamId: string,
  userEmail: string
): Promise<BusinessPermission[]> {
  const normalizedEmail = normalizeEmail(userEmail);
  const now = new Date().toISOString();

  const { data, error } = await (supabaseAdmin.from('team_business_permissions') as any)
    .select('permission')
    .eq('team_id', teamId)
    .eq('user_email', normalizedEmail)
    .or(`expires_at.is.null,expires_at.gt.${now}`);

  if (error) {
    console.error('[BusinessPermissions] Failed to load grants:', error);
    throw new Error(`Failed to load business permissions: ${error.message}`);
  }

  return (data || [])
    .map((row: any) => row.permission)
    .filter(isBusinessPermission);
}

export async function listBusinessPermissionGrants(teamId: string, userEmail?: string) {
  let query = (supabaseAdmin.from('team_business_permissions') as any)
    .select('*')
    .eq('team_id', teamId)
    .order('granted_at', { ascending: false });

  if (userEmail) query = query.eq('user_email', normalizeEmail(userEmail));

  const { data, error } = await query;
  if (error) {
    throw new Error(`Failed to list business permission grants: ${error.message}`);
  }

  return data || [];
}

export async function grantBusinessPermission(input: {
  teamId: string;
  userEmail: string;
  permission: BusinessPermission;
  grantedByEmail: string;
  expiresAt?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const { data, error } = await (supabaseAdmin.from('team_business_permissions') as any)
    .upsert({
      team_id: input.teamId,
      user_email: normalizeEmail(input.userEmail),
      permission: input.permission,
      granted_by_email: normalizeEmail(input.grantedByEmail),
      expires_at: input.expiresAt || null,
      metadata: input.metadata || {},
    }, { onConflict: 'team_id,user_email,permission' })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to grant business permission: ${error.message}`);
  }

  return data;
}

export async function revokeBusinessPermission(input: {
  teamId: string;
  userEmail: string;
  permission: BusinessPermission;
}) {
  const { error } = await (supabaseAdmin.from('team_business_permissions') as any)
    .delete()
    .eq('team_id', input.teamId)
    .eq('user_email', normalizeEmail(input.userEmail))
    .eq('permission', input.permission);

  if (error) {
    throw new Error(`Failed to revoke business permission: ${error.message}`);
  }
}

export async function getEffectiveBusinessPermissions(ctx: BusinessPermissionContext): Promise<BusinessPermission[]> {
  const defaults = getDefaultBusinessPermissions(ctx.role);
  const explicit = await getExplicitBusinessPermissions(ctx.teamId, ctx.email);
  return Array.from(new Set([...defaults, ...explicit]));
}

export async function hasBusinessPermission(
  ctx: BusinessPermissionContext,
  permission: BusinessPermission,
  options: RequireBusinessPermissionOptions = {}
): Promise<boolean> {
  const effective = await getEffectiveBusinessPermissions(ctx);
  if (!effective.includes(permission)) return false;

  if (options.project) {
    const allowedProjects = await getAllowedProjectsForEmail(ctx.email);
    return isProjectAllowed(options.project, allowedProjects);
  }

  return true;
}

export async function requireBusinessPermission(
  ctx: BusinessPermissionContext,
  permission: BusinessPermission,
  options: RequireBusinessPermissionOptions = {}
): Promise<true | NextResponse> {
  if (await hasBusinessPermission(ctx, permission, options)) {
    return true;
  }

  return NextResponse.json(
    {
      message: options.project
        ? 'Business permission or project permission denied.'
        : 'Business permission denied.',
      permission,
    },
    { status: 403 }
  );
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
