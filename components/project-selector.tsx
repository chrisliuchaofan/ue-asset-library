'use client';

import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useCallback, useTransition, useState, useEffect, useRef, useMemo } from 'react';
import { ChevronDown } from 'lucide-react';
import { getAllProjects, getProjectDisplayName } from '@/lib/constants';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ProjectSelectorProps {
  type?: 'assets' | 'materials' | 'search';
}

export function ProjectSelector({ type = 'assets' }: ProjectSelectorProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [allowedProjects, setAllowedProjects] = useState<string[] | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [menuWidth, setMenuWidth] = useState<number | undefined>(undefined);
  const availableProjects = useMemo(() => allowedProjects ?? getAllProjects(), [allowedProjects]);

  // 从URL参数获取当前选中的项目，如果没有则默认使用项目A（三冰）
  const currentProject = type === 'assets' || type === 'search'
    ? searchParams.get('projects')?.split(',')[0] || '项目A'
    : searchParams.get('project') || '项目A';

  useEffect(() => {
    let cancelled = false;

    fetch('/api/projects/permissions')
      .then(async (res) => {
        if (!res.ok) return null;
        return res.json() as Promise<{ projects?: string[] }>;
      })
      .then((data) => {
        if (cancelled || !data?.projects) return;
        setAllowedProjects(data.projects);
      })
      .catch(() => {
        if (!cancelled) setAllowedProjects(getAllProjects());
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // 如果URL中没有项目参数，自动设置默认项目；如果没有权限，则切到第一个可见项目
  useEffect(() => {
    const hasProject = type === 'assets' || type === 'search'
      ? searchParams.has('projects')
      : searchParams.has('project');

    const fallbackProject = availableProjects[0];
    if (!fallbackProject) {
      return;
    }

    if (!hasProject || !availableProjects.includes(currentProject)) {
      const params = new URLSearchParams(searchParams.toString());
      if (type === 'assets' || type === 'search') {
        params.set('projects', fallbackProject);
      } else {
        params.set('project', fallbackProject);
      }
      startTransition(() => {
        router.replace(`${pathname}?${params.toString()}`);
      });
    }
  }, [availableProjects, currentProject, searchParams, pathname, router, type, startTransition]);

  // 计算下拉菜单宽度，使其与按钮等宽
  useEffect(() => {
    const updateMenuWidth = () => {
      if (triggerRef.current) {
        const width = triggerRef.current.offsetWidth;
        setMenuWidth(width);
      }
    };
    
    updateMenuWidth();
    
    // 性能优化：使用防抖处理 resize 事件，避免频繁触发
    let timeoutId: NodeJS.Timeout | null = null;
    const debouncedUpdateMenuWidth = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      timeoutId = setTimeout(() => {
        updateMenuWidth();
      }, 150); // 150ms 防抖延迟
    };
    
    window.addEventListener('resize', debouncedUpdateMenuWidth, { passive: true });
    return () => {
      window.removeEventListener('resize', debouncedUpdateMenuWidth);
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [currentProject]);

  const handleProjectChange = useCallback(
    (project: string | null) => {
      if (project === currentProject) {
        return;
      }

      if (project === null) {
        // 清除项目选择，不需要密码验证
        const params = new URLSearchParams(searchParams.toString());
        
        if (type === 'assets' || type === 'search') {
          params.delete('projects');
        } else {
          params.delete('project');
        }
        
        params.delete('page');
        
        startTransition(() => {
          router.push(`${pathname}?${params.toString()}`);
        });
      } else {
        const params = new URLSearchParams(searchParams.toString());

        if (type === 'assets' || type === 'search') {
          params.set('projects', project);
        } else {
          params.set('project', project);
        }

        params.delete('page');

        startTransition(() => {
          router.push(`${pathname}?${params.toString()}`);
        });
      }
    },
    [currentProject, router, pathname, searchParams, type, startTransition]
  );

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            ref={triggerRef}
            variant="outline"
            className={cn(
              "h-8 sm:h-10 w-fit min-w-0 px-2 sm:px-3 justify-between gap-1 sm:gap-2 text-xs sm:text-sm whitespace-nowrap flex-shrink-0",
              !currentProject && "text-muted-foreground"
            )}
            disabled={isPending}
            onMouseEnter={() => {
              // 在鼠标悬停时更新宽度，确保下拉菜单打开时宽度正确
              if (triggerRef.current) {
                const width = triggerRef.current.offsetWidth;
                setMenuWidth(width);
              }
            }}
          >
            <span className="truncate max-w-[80px] sm:max-w-none">
              {availableProjects.length === 0
                ? '暂无项目权限'
                : currentProject
                  ? getProjectDisplayName(currentProject)
                  : '选择项目'}
            </span>
            <ChevronDown className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0 opacity-50 ml-0.5 sm:ml-1" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent 
          align="start" 
          className="w-fit"
          style={menuWidth ? { minWidth: `${menuWidth}px`, width: 'auto' } : undefined}
          sideOffset={4}
        >
          {availableProjects.length === 0 ? (
            <DropdownMenuItem disabled className="whitespace-nowrap text-muted-foreground">
              暂无项目权限
            </DropdownMenuItem>
          ) : availableProjects.map((project) => {
            const displayName = getProjectDisplayName(project);
            return (
              <DropdownMenuItem
                key={project}
                onClick={() => handleProjectChange(project)}
                className={cn(
                  "cursor-pointer whitespace-nowrap",
                  currentProject === project && "bg-accent"
                )}
                title={project !== displayName ? project : undefined}
              >
                {displayName}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
