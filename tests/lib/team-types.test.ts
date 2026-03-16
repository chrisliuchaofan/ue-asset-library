import { describe, it, expect } from 'vitest';
import {
  hasPermission,
  isRoleHigherThan,
  ROLE_PERMISSIONS,
  ROLE_LEVEL,
  type TeamRole,
  type Permission,
} from '@/lib/team/types';

// ---------- RBAC 权限矩阵 ----------
describe('ROLE_PERMISSIONS', () => {
  it('owner has all permissions', () => {
    const allPermissions: Permission[] = [
      'content:read', 'content:create', 'content:update', 'content:delete',
      'team:read', 'team:update', 'team:delete',
      'member:read', 'member:invite', 'member:remove', 'member:update_role',
      'credits:read', 'credits:manage',
      'admin:access',
    ];
    for (const perm of allPermissions) {
      expect(ROLE_PERMISSIONS.owner).toContain(perm);
    }
  });

  it('admin cannot delete team', () => {
    expect(ROLE_PERMISSIONS.admin).not.toContain('team:delete');
  });

  it('member can CRUD content but cannot manage team', () => {
    expect(ROLE_PERMISSIONS.member).toContain('content:read');
    expect(ROLE_PERMISSIONS.member).toContain('content:create');
    expect(ROLE_PERMISSIONS.member).toContain('content:update');
    expect(ROLE_PERMISSIONS.member).toContain('content:delete');
    expect(ROLE_PERMISSIONS.member).not.toContain('team:update');
    expect(ROLE_PERMISSIONS.member).not.toContain('member:invite');
  });

  it('viewer can only read', () => {
    expect(ROLE_PERMISSIONS.viewer).toContain('content:read');
    expect(ROLE_PERMISSIONS.viewer).toContain('team:read');
    expect(ROLE_PERMISSIONS.viewer).toContain('member:read');
    expect(ROLE_PERMISSIONS.viewer).toContain('credits:read');
    expect(ROLE_PERMISSIONS.viewer).not.toContain('content:create');
    expect(ROLE_PERMISSIONS.viewer).not.toContain('content:update');
    expect(ROLE_PERMISSIONS.viewer).not.toContain('content:delete');
    expect(ROLE_PERMISSIONS.viewer).not.toContain('admin:access');
  });
});

// ---------- hasPermission ----------
describe('hasPermission', () => {
  it('owner has admin:access', () => {
    expect(hasPermission('owner', 'admin:access')).toBe(true);
  });

  it('viewer does not have content:create', () => {
    expect(hasPermission('viewer', 'content:create')).toBe(false);
  });

  it('member has content:read', () => {
    expect(hasPermission('member', 'content:read')).toBe(true);
  });

  it('admin has member:invite', () => {
    expect(hasPermission('admin', 'member:invite')).toBe(true);
  });

  it('member does not have credits:manage', () => {
    expect(hasPermission('member', 'credits:manage')).toBe(false);
  });
});

// ---------- ROLE_LEVEL ----------
describe('ROLE_LEVEL', () => {
  it('has correct hierarchy: owner > admin > member > viewer', () => {
    expect(ROLE_LEVEL.owner).toBeGreaterThan(ROLE_LEVEL.admin);
    expect(ROLE_LEVEL.admin).toBeGreaterThan(ROLE_LEVEL.member);
    expect(ROLE_LEVEL.member).toBeGreaterThan(ROLE_LEVEL.viewer);
  });
});

// ---------- isRoleHigherThan ----------
describe('isRoleHigherThan', () => {
  it('owner > admin', () => {
    expect(isRoleHigherThan('owner', 'admin')).toBe(true);
  });

  it('admin > member', () => {
    expect(isRoleHigherThan('admin', 'member')).toBe(true);
  });

  it('member > viewer', () => {
    expect(isRoleHigherThan('member', 'viewer')).toBe(true);
  });

  it('viewer is not > member', () => {
    expect(isRoleHigherThan('viewer', 'member')).toBe(false);
  });

  it('same role is not higher', () => {
    expect(isRoleHigherThan('admin', 'admin')).toBe(false);
  });

  // Exhaustive: every pair
  it('all role pairs are consistent', () => {
    const roles: TeamRole[] = ['viewer', 'member', 'admin', 'owner'];
    for (let i = 0; i < roles.length; i++) {
      for (let j = 0; j < roles.length; j++) {
        if (i > j) {
          expect(isRoleHigherThan(roles[i], roles[j])).toBe(true);
        } else {
          expect(isRoleHigherThan(roles[i], roles[j])).toBe(false);
        }
      }
    }
  });
});
