'use client';

import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useCallback, useTransition, useState, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { PROJECTS, PROJECT_PASSWORDS } from '@/lib/constants';
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
  type?: 'assets' | 'materials';
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

  // 从URL参数获取当前选中的项目，如果没有则默认使用项目A（三冰）
  const currentProject = type === 'assets' 
    ? searchParams.get('projects')?.split(',')[0] || '项目A'
    : searchParams.get('project') || '项目A';

  // 如果URL中没有项目参数，自动设置默认项目A（三冰）
  useEffect(() => {
    const hasProject = type === 'assets' 
      ? searchParams.has('projects')
      : searchParams.has('project');
    
    if (!hasProject) {
      const params = new URLSearchParams(searchParams.toString());
      if (type === 'assets') {
        params.set('projects', '项目A');
      } else {
        params.set('project', '项目A');
      }
      startTransition(() => {
        router.replace(`${pathname}?${params.toString()}`);
      });
    }
  }, [searchParams, pathname, router, type, startTransition]);

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

      const expectedPassword = PROJECT_PASSWORDS[pendingProject as keyof typeof PROJECT_PASSWORDS];
      
      // 支持中文密码，直接比较字符串
      if (password === expectedPassword) {
        // 密码正确，切换项目
        const params = new URLSearchParams(searchParams.toString());
        
        if (type === 'assets') {
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
        
        if (type === 'assets') {
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
            variant="outline"
            className={cn(
              "h-8 sm:h-10 min-w-[100px] sm:min-w-[120px] justify-between gap-2 text-sm",
              !currentProject && "text-muted-foreground"
            )}
            disabled={isPending}
          >
            <span className="truncate">
              {currentProject || '选择项目'}
            </span>
            <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[200px]">
          {PROJECTS.map((project) => (
            <DropdownMenuItem
              key={project}
              onClick={() => handleProjectChange(project)}
              className={cn(
                "cursor-pointer",
                currentProject === project && "bg-accent"
              )}
            >
              {project}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* 密码验证对话框 */}
      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>项目密码验证</DialogTitle>
            <DialogDescription>
              请输入 {pendingProject} 的密码以切换项目
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handlePasswordSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Input
                  type="text"
                  placeholder="请输入密码（支持中文）"
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
                取消
              </Button>
              <Button type="submit">确认</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

