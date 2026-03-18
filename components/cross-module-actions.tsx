'use client';

import Link from 'next/link';
import { ArrowRight, type LucideIcon } from 'lucide-react';

interface CrossModuleAction {
  label: string;
  description: string;
  href: string;
  icon: LucideIcon;
}

interface CrossModuleActionsProps {
  actions: CrossModuleAction[];
  title?: string;
}

/**
 * 跨模块操作提示
 * 在当前模块底部/侧边展示下一步可能的操作，引导用户在模块间流转
 */
export function CrossModuleActions({ actions, title = '下一步' }: CrossModuleActionsProps) {
  if (actions.length === 0) return null;

  return (
    <div className="border-t border-border/50 pt-4 mt-6">
      <p className="text-xs text-muted-foreground mb-2.5 font-medium uppercase tracking-wider">
        {title}
      </p>
      <div className="flex flex-wrap gap-2">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.href}
              href={action.href}
              className="group inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-border/60 hover:bg-muted transition-all text-sm"
            >
              <Icon className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
              <span className="text-foreground/80 group-hover:text-foreground transition-colors">
                {action.label}
              </span>
              <ArrowRight className="w-3 h-3 text-muted-foreground/50 group-hover:text-primary/60 group-hover:translate-x-0.5 transition-all" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
