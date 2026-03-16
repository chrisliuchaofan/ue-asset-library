'use client';

import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';

interface Action {
  label: string;
  href?: string;
  onClick?: () => void;
  variant?: 'primary' | 'secondary';
}

interface ModuleEmptyStateProps {
  icon: LucideIcon;
  iconColor?: string;
  title: string;
  description: string;
  actions?: Action[];
}

/**
 * 模块专属空状态组件
 * 统一的视觉风格 + 自定义图标/文案/操作按钮
 */
export function ModuleEmptyState({
  icon: Icon,
  iconColor = 'text-muted-foreground/50',
  title,
  description,
  actions,
}: ModuleEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 sm:py-20 text-center px-4">
      {/* Icon */}
      <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-5">
        <Icon className={`w-7 h-7 sm:w-8 sm:h-8 ${iconColor}`} />
      </div>

      {/* Title */}
      <h3 className="text-base sm:text-lg font-semibold text-foreground mb-1.5">
        {title}
      </h3>

      {/* Description */}
      <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">
        {description}
      </p>

      {/* Actions */}
      {actions && actions.length > 0 && (
        <div className="mt-6 flex flex-col sm:flex-row items-center gap-2.5">
          {actions.map((action, index) => {
            const isPrimary = action.variant === 'primary' || (index === 0 && !action.variant);
            const className = isPrimary
              ? 'inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors'
              : 'inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors';

            if (action.href) {
              return (
                <Link key={action.label} href={action.href} className={className}>
                  {action.label}
                </Link>
              );
            }

            return (
              <button
                key={action.label}
                onClick={action.onClick}
                className={className}
              >
                {action.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
