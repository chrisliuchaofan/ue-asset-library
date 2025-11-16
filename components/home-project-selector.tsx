'use client';

import { useState, useCallback, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { PROJECTS, PROJECT_DISPLAY_NAMES } from '@/lib/constants';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface HomeProjectSelectorProps {
  value?: string | null;
  onChange?: (project: string | null) => void;
}

export function HomeProjectSelector({ value, onChange }: HomeProjectSelectorProps) {
  const [selectedProject, setSelectedProject] = useState<string | null>(value ?? null);

  // 同步外部传入的 value
  useEffect(() => {
    setSelectedProject(value ?? null);
  }, [value]);

  const handleProjectChange = useCallback(
    (project: string | null) => {
      setSelectedProject(project);
      if (onChange) {
        onChange(project);
      }
    },
    [onChange]
  );

  const displayName = selectedProject
    ? PROJECT_DISPLAY_NAMES[selectedProject as keyof typeof PROJECT_DISPLAY_NAMES] || selectedProject
    : '全部';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "h-10 w-fit px-3 justify-between gap-2 text-sm whitespace-nowrap",
            "bg-white/10 backdrop-blur border-white/30 text-white hover:bg-white/20",
            "transition-all duration-200 shadow-sm",
            "focus-visible:ring-2 focus-visible:ring-white/50",
            !selectedProject && "text-white/90"
          )}
        >
          <span className="font-medium">{displayName}</span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-80 ml-1" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="start" 
        className="w-fit min-w-[120px] z-50"
        sideOffset={4}
      >
        <DropdownMenuItem
          onClick={() => handleProjectChange(null)}
          className={cn(
            "cursor-pointer",
            !selectedProject && "bg-accent"
          )}
        >
          全部
        </DropdownMenuItem>
        {PROJECTS.map((project) => {
          const displayName = PROJECT_DISPLAY_NAMES[project];
          return (
            <DropdownMenuItem
              key={project}
              onClick={() => handleProjectChange(project)}
              className={cn(
                "cursor-pointer",
                selectedProject === project && "bg-accent"
              )}
            >
              {displayName}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

