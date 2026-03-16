/**
 * 团队服务层
 *
 * 提供团队 CRUD、成员管理、邀请码管理等核心操作
 * 所有操作使用 supabaseAdmin（Service Role Key），绕过 RLS
 */

import { supabaseAdmin } from '@/lib/supabase/admin';
import type { Team, TeamMember, TeamInvitation, TeamRole } from './types';

// ==================== 团队操作 ====================

/**
 * 获取用户所属的所有团队
 */
export async function getUserTeams(userId: string): Promise<(TeamMember & { team: Team })[]> {
  const { data, error } = await (supabaseAdmin.from('team_members') as any)
    .select(`
      *,
      team:teams(*)
    `)
    .eq('user_id', userId)
    .order('joined_at', { ascending: false });

  if (error) {
    console.error('[TeamService] getUserTeams error:', error);
    throw new Error('获取团队列表失败');
  }

  return data || [];
}

/**
 * 获取团队详情
 */
export async function getTeam(teamId: string): Promise<Team | null> {
  const { data, error } = await (supabaseAdmin.from('teams') as any)
    .select('*')
    .eq('id', teamId)
    .single();

  if (error) {
    return null;
  }

  return data;
}

/**
 * 通过 slug 获取团队
 */
export async function getTeamBySlug(slug: string): Promise<Team | null> {
  const { data, error } = await (supabaseAdmin.from('teams') as any)
    .select('*')
    .eq('slug', slug)
    .single();

  if (error) {
    return null;
  }

  return data;
}

/**
 * 创建团队
 */
export async function createTeam(params: {
  name: string;
  slug: string;
  description?: string;
  createdBy: string;
}): Promise<Team> {
  const { data, error } = await (supabaseAdmin.from('teams') as any)
    .insert({
      name: params.name,
      slug: params.slug,
      description: params.description || null,
      created_by: params.createdBy,
    })
    .select()
    .single();

  if (error) {
    console.error('[TeamService] createTeam error:', error);
    if (error.code === '23505') {
      throw new Error('团队标识已存在');
    }
    throw new Error('创建团队失败');
  }

  // 将创建者添加为 owner
  await addMember(data.id, params.createdBy, 'owner');

  return data;
}

/**
 * 更新团队
 */
export async function updateTeam(
  teamId: string,
  updates: { name?: string; description?: string; avatar_url?: string }
): Promise<Team> {
  const { data, error } = await (supabaseAdmin.from('teams') as any)
    .update(updates)
    .eq('id', teamId)
    .select()
    .single();

  if (error) {
    console.error('[TeamService] updateTeam error:', error);
    throw new Error('更新团队失败');
  }

  return data;
}

/**
 * 删除团队
 */
export async function deleteTeam(teamId: string): Promise<void> {
  const { error } = await (supabaseAdmin.from('teams') as any)
    .delete()
    .eq('id', teamId);

  if (error) {
    console.error('[TeamService] deleteTeam error:', error);
    throw new Error('删除团队失败');
  }
}

// ==================== 成员操作 ====================

/**
 * 获取团队成员列表
 */
export async function getTeamMembers(teamId: string): Promise<TeamMember[]> {
  const { data, error } = await (supabaseAdmin.from('team_members') as any)
    .select('*')
    .eq('team_id', teamId)
    .order('joined_at', { ascending: true });

  if (error) {
    console.error('[TeamService] getTeamMembers error:', error);
    throw new Error('获取成员列表失败');
  }

  return data || [];
}

/**
 * 获取用户在指定团队中的角色
 */
export async function getMemberRole(teamId: string, userId: string): Promise<TeamRole | null> {
  const { data, error } = await (supabaseAdmin.from('team_members') as any)
    .select('role')
    .eq('team_id', teamId)
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    return null;
  }

  return data.role as TeamRole;
}

/**
 * 添加团队成员
 */
export async function addMember(
  teamId: string,
  userId: string,
  role: TeamRole = 'member'
): Promise<TeamMember> {
  const { data, error } = await (supabaseAdmin.from('team_members') as any)
    .insert({
      team_id: teamId,
      user_id: userId,
      role,
    })
    .select()
    .single();

  if (error) {
    console.error('[TeamService] addMember error:', error);
    if (error.code === '23505') {
      throw new Error('该用户已是团队成员');
    }
    throw new Error('添加成员失败');
  }

  return data;
}

/**
 * 移除团队成员
 */
export async function removeMember(teamId: string, userId: string): Promise<void> {
  const { error } = await (supabaseAdmin.from('team_members') as any)
    .delete()
    .eq('team_id', teamId)
    .eq('user_id', userId);

  if (error) {
    console.error('[TeamService] removeMember error:', error);
    throw new Error('移除成员失败');
  }
}

/**
 * 更新成员角色
 */
export async function updateMemberRole(
  teamId: string,
  userId: string,
  newRole: TeamRole
): Promise<TeamMember> {
  const { data, error } = await (supabaseAdmin.from('team_members') as any)
    .update({ role: newRole })
    .eq('team_id', teamId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    console.error('[TeamService] updateMemberRole error:', error);
    throw new Error('更新角色失败');
  }

  return data;
}

// ==================== 邀请码操作 ====================

/**
 * 生成随机邀请码
 */
function generateInviteCode(length = 8): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 排除容易混淆的字符
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * 创建邀请码
 */
export async function createInvitation(params: {
  teamId: string;
  createdBy: string;
  role?: TeamRole;
  email?: string;
  maxUses?: number;
  expiresInDays?: number;
}): Promise<TeamInvitation> {
  const code = generateInviteCode();
  const expiresAt = params.expiresInDays
    ? new Date(Date.now() + params.expiresInDays * 24 * 60 * 60 * 1000).toISOString()
    : null;

  const { data, error } = await (supabaseAdmin.from('team_invitations') as any)
    .insert({
      team_id: params.teamId,
      code,
      email: params.email || null,
      role: params.role || 'member',
      max_uses: params.maxUses || 1,
      created_by: params.createdBy,
      expires_at: expiresAt,
    })
    .select()
    .single();

  if (error) {
    console.error('[TeamService] createInvitation error:', error);
    throw new Error('创建邀请码失败');
  }

  return data;
}

/**
 * 验证邀请码并获取团队信息
 */
export async function validateInvitation(code: string): Promise<TeamInvitation & { team: Team } | null> {
  const { data, error } = await (supabaseAdmin.from('team_invitations') as any)
    .select(`
      *,
      team:teams(*)
    `)
    .eq('code', code.toUpperCase())
    .eq('status', 'active')
    .single();

  if (error || !data) {
    return null;
  }

  // 检查是否过期
  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    // 自动标记为过期
    await (supabaseAdmin.from('team_invitations') as any)
      .update({ status: 'expired' })
      .eq('id', data.id);
    return null;
  }

  // 检查是否已达到使用上限
  if (data.used_count >= data.max_uses) {
    await (supabaseAdmin.from('team_invitations') as any)
      .update({ status: 'used' })
      .eq('id', data.id);
    return null;
  }

  return data;
}

/**
 * 消耗邀请码（注册成功后调用）
 */
export async function consumeInvitation(invitationId: string): Promise<void> {
  // 使用 RPC 或直接更新（增加 used_count）
  const { data } = await (supabaseAdmin.from('team_invitations') as any)
    .select('used_count, max_uses')
    .eq('id', invitationId)
    .single();

  if (!data) return;

  const newCount = (data.used_count || 0) + 1;
  const newStatus = newCount >= data.max_uses ? 'used' : 'active';

  await (supabaseAdmin.from('team_invitations') as any)
    .update({
      used_count: newCount,
      status: newStatus,
    })
    .eq('id', invitationId);
}

/**
 * 获取团队的邀请码列表
 */
export async function getTeamInvitations(teamId: string): Promise<TeamInvitation[]> {
  const { data, error } = await (supabaseAdmin.from('team_invitations') as any)
    .select('*')
    .eq('team_id', teamId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[TeamService] getTeamInvitations error:', error);
    throw new Error('获取邀请码列表失败');
  }

  return data || [];
}

/**
 * 撤销邀请码
 */
export async function revokeInvitation(invitationId: string): Promise<void> {
  const { error } = await (supabaseAdmin.from('team_invitations') as any)
    .update({ status: 'revoked' })
    .eq('id', invitationId);

  if (error) {
    console.error('[TeamService] revokeInvitation error:', error);
    throw new Error('撤销邀请码失败');
  }
}

// ==================== 辅助函数 ====================

/**
 * 生成 URL-safe 的 slug
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fff]+/g, '-')  // 保留中文和字母数字
    .replace(/^-+|-+$/g, '')
    .substring(0, 50)
    || 'team-' + Date.now();
}

/**
 * 确保 slug 在数据库中唯一
 */
export async function ensureUniqueSlug(baseSlug: string): Promise<string> {
  let slug = baseSlug;
  let suffix = 0;

  while (true) {
    const existing = await getTeamBySlug(slug);
    if (!existing) return slug;
    suffix++;
    slug = `${baseSlug}-${suffix}`;
  }
}

/**
 * 获取用户的默认团队（第一个或最近加入的）
 */
export async function getDefaultTeam(userId: string): Promise<{ teamId: string; role: TeamRole } | null> {
  const { data, error } = await (supabaseAdmin.from('team_members') as any)
    .select('team_id, role')
    .eq('user_id', userId)
    .order('joined_at', { ascending: true })
    .limit(1)
    .single();

  if (error || !data) {
    return null;
  }

  return { teamId: data.team_id, role: data.role as TeamRole };
}
