'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  FolderIcon,
  SearchIcon,
  VideoIcon,
  CheckCircle2Icon,
  ChevronRight,
} from 'lucide-react';

const workflowSteps = [
  { href: '/materials', label: '素材库', icon: FolderIcon },
  { href: '/analysis', label: '爆款分析', icon: SearchIcon },
  { href: '/studio', label: 'AI 创作', icon: VideoIcon },
  { href: '/review', label: '智能审核', icon: CheckCircle2Icon },
];

/**
 * 工作流导航条
 * 显示 素材库 → 爆款分析 → AI 创作 → 智能审核 四步流程
 * 当前步骤高亮，仅在工作流相关页面显示
 */
export function WorkflowBar() {
  const pathname = usePathname();

  // 仅在工作流页面显示
  const isWorkflowPage = workflowSteps.some(
    (step) => pathname.startsWith(step.href)
  );
  if (!isWorkflowPage) return null;

  const currentIndex = workflowSteps.findIndex(s => pathname.startsWith(s.href));

  return (
    <div className="flex items-center gap-0.5 sm:gap-1 px-3 sm:px-4 py-1.5 border-b border-border bg-card/50 backdrop-blur-sm overflow-x-auto scrollbar-none flex-shrink-0">
      {workflowSteps.map((step, index) => {
        const Icon = step.icon;
        const isActive = pathname.startsWith(step.href);
        const isPast = index < currentIndex;

        return (
          <div key={step.href} className="flex items-center shrink-0">
            {index > 0 && (
              <ChevronRight className={`w-3 h-3 mx-0.5 sm:mx-1 ${isPast ? 'text-primary/40' : 'text-muted-foreground/30'}`} />
            )}
            <Link
              href={step.href}
              className={`inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 rounded-md text-xs transition-colors ${
                isActive
                  ? 'bg-primary/10 text-primary font-medium'
                  : isPast
                    ? 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                    : 'text-muted-foreground/60 hover:text-muted-foreground hover:bg-muted/50'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{step.label}</span>
            </Link>
          </div>
        );
      })}
    </div>
  );
}
