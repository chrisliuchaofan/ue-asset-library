'use client';

import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useCallback, useTransition, useState, useEffect, useRef, useMemo } from 'react';
import { ChevronDown } from 'lucide-react';
import { PROJECTS, PROJECT_PASSWORDS, getAllProjects, getProjectDisplayName, getProjectPassword, getDescription } from '@/lib/constants';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface ProjectSelectorProps {
  type?: 'assets' | 'materials' | 'search';
}

export function ProjectSelector({ type = 'assets' }: ProjectSelectorProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [pendingProject, setPendingProject] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [menuWidth, setMenuWidth] = useState<number | undefined>(undefined);

  // 从URL参数获取当前选中的项目，如果没有则默认使用项目A（三冰）
  const currentProject = type === 'assets' || type === 'search'
    ? searchParams.get('projects')?.split(',')[0] || '项目A'
    : searchParams.get('project') || '项目A';

  // 如果URL中没有项目参数，自动设置默认项目A（三冰）
  useEffect(() => {
    const hasProject = type === 'assets' || type === 'search'
      ? searchParams.has('projects')
      : searchParams.has('project');
    
    if (!hasProject) {
      const params = new URLSearchParams(searchParams.toString());
      if (type === 'assets' || type === 'search') {
        params.set('projects', '项目A');
      } else {
        params.set('project', '项目A');
      }
      startTransition(() => {
        router.replace(`${pathname}?${params.toString()}`);
      });
    }
  }, [searchParams, pathname, router, type, startTransition]);

  // 计算下拉菜单宽度，使其与按钮等宽
  useEffect(() => {
    const updateMenuWidth = () => {
      if (triggerRef.current) {
        const width = triggerRef.current.offsetWidth;
        setMenuWidth(width);
      }
    };
    
    updateMenuWidth();
    // 监听窗口大小变化
    window.addEventListener('resize', updateMenuWidth);
    return () => window.removeEventListener('resize', updateMenuWidth);
  }, [currentProject]);

  const handleProjectClick = useCallback(
    (project: string) => {
      // 如果点击的是当前项目，不需要验证
      if (project === currentProject) {
        return;
      }
      
      // 打开密码输入对话框
      setPendingProject(project);
      setPassword('');
      setError('');
      setPasswordDialogOpen(true);
    },
    [currentProject]
  );

  const handlePasswordSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      setError('');

      if (!pendingProject) {
        return;
      }

      // 使用统一的密码获取函数（支持自定义项目）
      const expectedPassword = getProjectPassword(pendingProject);
      
      // 支持中文密码，直接比较字符串
      if (password === expectedPassword) {
        // 密码正确，切换项目
        const params = new URLSearchParams(searchParams.toString());
        
        if (type === 'assets' || type === 'search') {
          if (pendingProject) {
            params.set('projects', pendingProject);
          } else {
            params.delete('projects');
          }
        } else {
          if (pendingProject) {
            params.set('project', pendingProject);
          } else {
            params.delete('project');
          }
        }
        
        // 重置页码
        params.delete('page');
        
        startTransition(() => {
          router.push(`${pathname}?${params.toString()}`);
        });
        
        // 关闭对话框
        setPasswordDialogOpen(false);
        setPassword('');
        setPendingProject(null);
      } else {
        setError('密码错误，请重试');
        setPassword('');
      }
    },
    [password, pendingProject, router, pathname, searchParams, type]
  );

  const handleProjectChange = useCallback(
    (project: string | null) => {
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
        handleProjectClick(project);
      }
    },
    [router, pathname, searchParams, type, handleProjectClick]
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
              {currentProject ? getProjectDisplayName(currentProject) : '选择项目'}
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
          {getAllProjects().map((project) => {
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

      {/* 密码验证对话框 */}
      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{useMemo(() => getDescription('projectPasswordDialogTitle'), [])}</DialogTitle>
            <DialogDescription>
              {useMemo(() => getDescription('projectPasswordDialogDescription', { project: pendingProject || '' }), [pendingProject])}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handlePasswordSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Input
                  type="text"
                  placeholder={useMemo(() => getDescription('projectPasswordInputPlaceholder'), [])}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError('');
                  }}
                  autoFocus
                  autoComplete="off"
                />
                {error && <p className="text-sm text-destructive">{error}</p>}
              </div>
            </div>
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  setPasswordDialogOpen(false);
                  setPassword('');
                  setPendingProject(null);
                  setError('');
                }}
              >
                {useMemo(() => getDescription('projectPasswordDialogCancel'), [])}
              </Button>
              <Button type="submit">{useMemo(() => getDescription('projectPasswordDialogConfirm'), [])}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

