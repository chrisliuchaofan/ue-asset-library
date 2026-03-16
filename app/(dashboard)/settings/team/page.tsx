'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTeam } from '@/lib/team/use-team';
import { useSession } from 'next-auth/react';
import {
  UsersIcon,
  Copy,
  Plus,
  Trash2,
  Loader2,
  ShieldCheck,
  Crown,
  Eye,
  UserIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/page-header';

interface Member {
  id: string;
  team_id: string;
  user_id: string;
  role: string;
  joined_at: string;
}

interface Invitation {
  id: string;
  code: string;
  email: string | null;
  role: string;
  status: string;
  max_uses: number;
  used_count: number;
  expires_at: string | null;
  created_at: string;
}

const ROLE_LABELS: Record<string, { label: string; icon: typeof Crown }> = {
  owner: { label: '所有者', icon: Crown },
  admin: { label: '管理员', icon: ShieldCheck },
  member: { label: '成员', icon: UserIcon },
  viewer: { label: '查看者', icon: Eye },
};

export default function TeamSettingsPage() {
  const { currentTeam, role } = useTeam();
  const { data: session } = useSession();
  const [members, setMembers] = useState<Member[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [loadingInvitations, setLoadingInvitations] = useState(true);
  const [creatingInvite, setCreatingInvite] = useState(false);
  const [newInviteRole, setNewInviteRole] = useState('member');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const teamId = currentTeam?.id;
  const canManage = role === 'owner' || role === 'admin';

  // 获取成员
  const fetchMembers = useCallback(async () => {
    if (!teamId) return;
    setLoadingMembers(true);
    try {
      const res = await fetch(`/api/teams/${teamId}/members`);
      if (res.ok) {
        const data = await res.json();
        setMembers(data.members || []);
      }
    } catch (error) {
      console.error('获取成员失败:', error);
    } finally {
      setLoadingMembers(false);
    }
  }, [teamId]);

  // 获取邀请码
  const fetchInvitations = useCallback(async () => {
    if (!teamId || !canManage) return;
    setLoadingInvitations(true);
    try {
      const res = await fetch(`/api/teams/${teamId}/invitations`);
      if (res.ok) {
        const data = await res.json();
        setInvitations(data.invitations || []);
      }
    } catch (error) {
      console.error('获取邀请码失败:', error);
    } finally {
      setLoadingInvitations(false);
    }
  }, [teamId, canManage]);

  useEffect(() => {
    fetchMembers();
    fetchInvitations();
  }, [fetchMembers, fetchInvitations]);

  // 生成邀请码
  const handleCreateInvitation = async () => {
    if (!teamId) return;
    setCreatingInvite(true);
    try {
      const res = await fetch(`/api/teams/${teamId}/invitations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: newInviteRole,
          max_uses: 10,
          expires_in_days: 7,
        }),
      });
      if (res.ok) {
        await fetchInvitations();
      }
    } catch (error) {
      console.error('创建邀请码失败:', error);
    } finally {
      setCreatingInvite(false);
    }
  };

  // 复制邀请码
  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // 撤销邀请码
  const handleRevokeInvitation = async (invId: string) => {
    if (!teamId) return;
    try {
      await fetch(`/api/teams/${teamId}/invitations/${invId}`, { method: 'DELETE' });
      await fetchInvitations();
    } catch (error) {
      console.error('撤销邀请码失败:', error);
    }
  };

  // 移除成员
  const handleRemoveMember = async (userId: string) => {
    if (!teamId) return;
    if (!confirm('确认移除该成员？')) return;
    try {
      await fetch(`/api/teams/${teamId}/members`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      await fetchMembers();
    } catch (error) {
      console.error('移除成员失败:', error);
    }
  };

  if (!currentTeam) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-muted-foreground">请先选择一个团队</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <PageHeader
        title="团队管理"
        description="成员和邀请码"
        backHref="/settings"
      />
      <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-4xl mx-auto">
        {/* 成员列表 */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <UsersIcon className="w-5 h-5 text-primary" />
            <h2 className="text-base font-semibold">
              团队成员 ({members.length})
            </h2>
          </div>

          {loadingMembers ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="border border-border rounded-lg overflow-hidden">
              {members.map((member) => {
                const roleInfo = ROLE_LABELS[member.role] || ROLE_LABELS.member;
                const RoleIcon = roleInfo.icon;
                const isMe = member.user_id === session?.user?.email;

                return (
                  <div
                    key={member.id}
                    className="flex items-center justify-between px-4 py-3 border-b border-border last:border-b-0 hover:bg-accent/30"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                        <UserIcon className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          {member.user_id}
                          {isMe && (
                            <span className="text-xs text-muted-foreground ml-1">(我)</span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          加入于 {new Date(member.joined_at).toLocaleDateString('zh-CN')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-muted">
                        <RoleIcon className="w-3 h-3" />
                        {roleInfo.label}
                      </span>
                      {canManage && !isMe && member.role !== 'owner' && (
                        <button
                          onClick={() => handleRemoveMember(member.user_id)}
                          className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                          title="移除成员"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 邀请码管理（仅 admin/owner 可见） */}
        {canManage && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold">邀请码</h2>
              <div className="flex items-center gap-2">
                <select
                  value={newInviteRole}
                  onChange={(e) => setNewInviteRole(e.target.value)}
                  className="text-xs px-2 py-1.5 rounded border border-border bg-background"
                >
                  <option value="member">成员</option>
                  <option value="admin">管理员</option>
                  <option value="viewer">查看者</option>
                </select>
                <Button
                  size="sm"
                  onClick={handleCreateInvitation}
                  disabled={creatingInvite}
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  {creatingInvite ? '生成中...' : '生成邀请码'}
                </Button>
              </div>
            </div>

            {loadingInvitations ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : invitations.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                还没有邀请码，点击「生成邀请码」创建
              </p>
            ) : (
              <div className="border border-border rounded-lg overflow-hidden">
                {invitations.map((inv) => (
                  <div
                    key={inv.id}
                    className="flex items-center justify-between px-4 py-3 border-b border-border last:border-b-0"
                  >
                    <div className="flex items-center gap-3">
                      <code className="text-sm font-mono font-bold tracking-wider bg-muted px-2 py-0.5 rounded">
                        {inv.code}
                      </code>
                      <button
                        onClick={() => handleCopyCode(inv.code)}
                        className="p-1 text-muted-foreground hover:text-foreground"
                        title="复制邀请码"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      {copiedCode === inv.code && (
                        <span className="text-xs text-success">已复制</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>角色: {ROLE_LABELS[inv.role]?.label || inv.role}</span>
                      <span>使用: {inv.used_count}/{inv.max_uses}</span>
                      <span className={`px-1.5 py-0.5 rounded ${
                        inv.status === 'active' ? 'bg-success/10 text-success' :
                        inv.status === 'used' ? 'bg-warning/10 text-warning' :
                        'bg-destructive/10 text-destructive'
                      }`}>
                        {inv.status === 'active' ? '有效' :
                         inv.status === 'used' ? '已用完' :
                         inv.status === 'expired' ? '已过期' : '已撤销'}
                      </span>
                      {inv.status === 'active' && (
                        <button
                          onClick={() => handleRevokeInvitation(inv.id)}
                          className="p-1 text-muted-foreground hover:text-destructive"
                          title="撤销"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
    </div>
  );
}
