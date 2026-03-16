/**
 * 团队系统类型定义
 *
 * 多团队 RBAC 架构的核心类型
 */

// ==================== 角色与权限 ====================

/** 团队角色 */
export type TeamRole = 'owner' | 'admin' | 'member' | 'viewer';

/** 权限类型 */
export type Permission =
  // 内容操作
  | 'content:read'
  | 'content:create'
  | 'content:update'
  | 'content:delete'
  // 团队管理
  | 'team:read'
  | 'team:update'
  | 'team:delete'
  // 成员管理
  | 'member:read'
  | 'member:invite'
  | 'member:remove'
  | 'member:update_role'
  // 积分/计费
  | 'credits:read'
  | 'credits:manage'
  // 管理后台
  | 'admin:access';

/** 角色 → 权限 映射 */
export const ROLE_PERMISSIONS: Record<TeamRole, Permission[]> = {
  owner: [
    'content:read', 'content:create', 'content:update', 'content:delete',
    'team:read', 'team:update', 'team:delete',
    'member:read', 'member:invite', 'member:remove', 'member:update_role',
    'credits:read', 'credits:manage',
    'admin:access',
  ],
  admin: [
    'content:read', 'content:create', 'content:update', 'content:delete',
    'team:read', 'team:update',
    'member:read', 'member:invite', 'member:remove', 'member:update_role',
    'credits:read', 'credits:manage',
    'admin:access',
  ],
  member: [
    'content:read', 'content:create', 'content:update', 'content:delete',
    'team:read',
    'member:read',
    'credits:read',
  ],
  viewer: [
    'content:read',
    'team:read',
    'member:read',
    'credits:read',
  ],
};

/** 检查角色是否拥有指定权限 */
export function hasPermission(role: TeamRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

/** 角色等级（数值越大权限越高） */
export const ROLE_LEVEL: Record<TeamRole, number> = {
  viewer: 0,
  member: 1,
  admin: 2,
  owner: 3,
};

/** 检查 roleA 是否高于 roleB */
export function isRoleHigherThan(roleA: TeamRole, roleB: TeamRole): boolean {
  return ROLE_LEVEL[roleA] > ROLE_LEVEL[roleB];
}

// ==================== 数据模型 ====================

/** 团队 */
export interface Team {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  avatar_url: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

/** 团队成员 */
export interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  role: TeamRole;
  joined_at: string;
  // 关联查询时可能带有的用户信息
  profile?: {
    email: string;
    username: string | null;
    avatar_url: string | null;
  };
}

/** 邀请码 */
export interface TeamInvitation {
  id: string;
  team_id: string;
  code: string;
  email: string | null;
  role: TeamRole;
  status: 'active' | 'used' | 'expired' | 'revoked';
  max_uses: number;
  used_count: number;
  created_by: string;
  expires_at: string | null;
  created_at: string;
  // 关联查询时可能带有的团队信息
  team?: Team;
}

// ==================== 上下文类型 ====================

/** 团队上下文（注入到 JWT 和 Session 中） */
export interface TeamContext {
  teamId: string;
  teamName: string;
  teamSlug: string;
  role: TeamRole;
}

/** API 路由中使用的完整用户+团队上下文 */
export interface AuthenticatedContext {
  userId: string;
  email: string;
  teamId: string;
  teamSlug: string;
  role: TeamRole;
}

// ==================== API 请求/响应类型 ====================

/** 创建团队请求 */
export interface CreateTeamRequest {
  name: string;
  slug?: string;
  description?: string;
}

/** 创建邀请码请求 */
export interface CreateInvitationRequest {
  role?: TeamRole;
  email?: string;
  max_uses?: number;
  expires_in_days?: number;
}

/** 注册请求 */
export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  invitation_code: string;
}

/** 切换团队请求 */
export interface SwitchTeamRequest {
  teamId: string;
}
