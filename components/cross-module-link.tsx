'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface CrossModuleLinkProps {
  icon?: LucideIcon;
  label: string;
  href: string;
  /** 可选参数会附加到 URL query string */
  params?: Record<string, string>;
  variant?: 'inline' | 'card';
  className?: string;
}

/**
 * 跨模块快速跳转组件
 * - inline: 文字链接风格，适合在内容中嵌入
 * - card: 卡片风格，适合在操作区域展示
 */
export function CrossModuleLink({
  icon: Icon,
  label,
  href,
  params,
  variant = 'inline',
  className = '',
}: CrossModuleLinkProps) {
  const url = params
    ? `${href}?${new URLSearchParams(params).toString()}`
    : href;

  if (variant === 'card') {
    return (
      <Link
        href={url}
        className={`group inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-border bg-card hover:bg-accent/50 hover:bg-white/[0.03] transition-all text-sm ${className}`}
      >
        {Icon && <Icon className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />}
        <span className="text-muted-foreground group-hover:text-foreground transition-colors">
          {label}
        </span>
        <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/50 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
      </Link>
    );
  }

  return (
    <Link
      href={url}
      className={`group inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors ${className}`}
    >
      {Icon && <Icon className="w-3.5 h-3.5" />}
      <span>{label}</span>
      <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
    </Link>
  );
}

interface CrossModuleActionsProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * 跨模块操作组容器
 * 用于在模块页面底部或右侧显示相关模块的快捷入口
 */
export function CrossModuleActions({ children, className = '' }: CrossModuleActionsProps) {
  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {children}
    </div>
  );
}
