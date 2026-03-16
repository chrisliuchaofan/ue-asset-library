'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { useSession } from 'next-auth/react';
import type { TeamRole } from './types';

interface TeamInfo {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  avatar_url?: string | null;
  role: TeamRole;
  joined_at: string;
}

interface TeamContextValue {
  /** 当前活跃团队 */
  currentTeam: TeamInfo | null;
  /** 用户所属的所有团队 */
  teams: TeamInfo[];
  /** 当前角色 */
  role: TeamRole | null;
  /** 是否正在加载团队信息 */
  loading: boolean;
  /** 切换团队 */
  switchTeam: (teamId: string) => Promise<void>;
  /** 刷新团队列表 */
  refreshTeams: () => Promise<void>;
}

const TeamContext = createContext<TeamContextValue>({
  currentTeam: null,
  teams: [],
  role: null,
  loading: true,
  switchTeam: async () => {},
  refreshTeams: async () => {},
});

export function TeamProvider({ children }: { children: ReactNode }) {
  const { data: session, update: updateSession } = useSession();
  const [teams, setTeams] = useState<TeamInfo[]>([]);
  const [loading, setLoading] = useState(true);

  // 从 session 中获取活跃团队
  const activeTeamId = session?.user?.activeTeamId;
  const activeTeamRole = session?.user?.activeTeamRole as TeamRole | null;
  const activeTeamName = session?.user?.activeTeamName;

  // 获取团队列表
  const refreshTeams = useCallback(async () => {
    if (!session?.user) {
      setTeams([]);
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/teams');
      if (res.ok) {
        const data = await res.json();
        setTeams(data.teams || []);
      }
    } catch (error) {
      console.error('[useTeam] 获取团队列表失败:', error);
    } finally {
      setLoading(false);
    }
  }, [session?.user]);

  useEffect(() => {
    refreshTeams();
  }, [refreshTeams]);

  // 当前活跃团队的完整信息
  const currentTeam = teams.find(t => t.id === activeTeamId) || (
    activeTeamId ? {
      id: activeTeamId,
      name: activeTeamName || '加载中...',
      slug: '',
      role: activeTeamRole || 'member' as TeamRole,
      joined_at: '',
    } : null
  );

  // 切换团队
  const switchTeam = useCallback(async (teamId: string) => {
    try {
      const res = await fetch('/api/teams/switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId }),
      });

      if (res.ok) {
        // 触发 session 更新（会重新调用 JWT callback）
        await updateSession();
        // 重新加载页面以刷新所有数据
        window.location.reload();
      }
    } catch (error) {
      console.error('[useTeam] 切换团队失败:', error);
    }
  }, [updateSession]);

  return (
    <TeamContext.Provider
      value={{
        currentTeam,
        teams,
        role: activeTeamRole,
        loading,
        switchTeam,
        refreshTeams,
      }}
    >
      {children}
    </TeamContext.Provider>
  );
}

export function useTeam() {
  return useContext(TeamContext);
}
