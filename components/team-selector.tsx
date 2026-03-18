'use client';

import { useState } from 'react';
import { useTeam } from '@/lib/team/use-team';
import { ChevronDownIcon, PlusIcon, CheckIcon, UsersIcon } from 'lucide-react';

/**
 * 团队选择器 — 显示在侧边栏顶部
 * 支持切换团队、创建新团队
 */
export function TeamSelector() {
  const { currentTeam, teams, loading, switchTeam } = useTeam();
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [createLoading, setCreateLoading] = useState(false);

  if (loading) {
    return (
      <div className="px-3 py-2">
        <div className="h-8 bg-muted/50 rounded-md animate-pulse" />
      </div>
    );
  }

  // 如果用户没有团队（旧版用户），不显示选择器
  if (teams.length === 0 && !currentTeam) {
    return null;
  }

  const handleCreateTeam = async () => {
    if (!newTeamName.trim()) return;
    setCreateLoading(true);
    try {
      const res = await fetch('/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newTeamName.trim() }),
      });

      if (res.ok) {
        const team = await res.json();
        setNewTeamName('');
        setCreating(false);
        // 切换到新创建的团队
        await switchTeam(team.id);
      }
    } catch (error) {
      console.error('创建团队失败:', error);
    } finally {
      setCreateLoading(false);
    }
  };

  return (
    <div className="relative">
      {/* 当前团队按钮 */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-3 py-2 rounded-md hover:bg-muted transition-colors text-left"
      >
        <div className="w-6 h-6 rounded bg-primary/20 flex items-center justify-center flex-shrink-0">
          <UsersIcon className="w-3.5 h-3.5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium truncate">
            {currentTeam?.name || '选择团队'}
          </p>
          {currentTeam?.role && (
            <p className="text-[10px] text-muted-foreground">
              {currentTeam.role === 'owner' ? '所有者' :
               currentTeam.role === 'admin' ? '管理员' :
               currentTeam.role === 'member' ? '成员' : '查看者'}
            </p>
          )}
        </div>
        <ChevronDownIcon className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {/* 下拉菜单 */}
      {open && (
        <>
          {/* 遮罩 */}
          <div className="fixed inset-0 z-40" onClick={() => { setOpen(false); setCreating(false); }} />

          {/* 团队列表 */}
          <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-popover border border-border rounded-lg shadow-lg overflow-hidden">
            <div className="py-1 max-h-60 overflow-y-auto">
              {teams.map((team) => (
                <button
                  key={team.id}
                  onClick={() => {
                    if (team.id !== currentTeam?.id) {
                      switchTeam(team.id);
                    }
                    setOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-muted transition-colors"
                >
                  <div className="w-5 h-5 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <UsersIcon className="w-3 h-3 text-primary" />
                  </div>
                  <span className="text-xs flex-1 truncate">{team.name}</span>
                  {team.id === currentTeam?.id && (
                    <CheckIcon className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                  )}
                </button>
              ))}
            </div>

            <div className="border-t border-border">
              {creating ? (
                <div className="p-2">
                  <input
                    type="text"
                    placeholder="团队名称"
                    value={newTeamName}
                    onChange={(e) => setNewTeamName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateTeam()}
                    className="w-full px-2 py-1.5 text-xs bg-muted/50 border border-border rounded outline-none focus:border-primary/50"
                    autoFocus
                    disabled={createLoading}
                  />
                  <div className="flex gap-1 mt-1.5">
                    <button
                      onClick={handleCreateTeam}
                      disabled={!newTeamName.trim() || createLoading}
                      className="flex-1 px-2 py-1 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50"
                    >
                      {createLoading ? '创建中...' : '创建'}
                    </button>
                    <button
                      onClick={() => { setCreating(false); setNewTeamName(''); }}
                      className="px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
                    >
                      取消
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setCreating(true)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-muted transition-colors text-xs text-muted-foreground"
                >
                  <PlusIcon className="w-3.5 h-3.5" />
                  创建新团队
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
