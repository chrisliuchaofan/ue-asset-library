'use client';

import React from 'react';
import Link from 'next/link';
import type { MaterialTemplate } from '@/data/template.schema';
import { TemplateStructureTimeline } from './template-structure-timeline';
import { cn } from '@/lib/utils';
import { Clock, Zap, BarChart3, Star } from 'lucide-react';

interface TemplateCardProps {
  template: MaterialTemplate;
  className?: string;
}

/**
 * 模版卡片组件
 * 用于模版列表页展示
 */
export function TemplateCard({ template, className }: TemplateCardProps) {
  const scoreStars = Math.round(template.effectivenessScore / 20); // 0-100 → 0-5 stars

  return (
    <Link
      href={`/templates/${template.id}`}
      className={cn(
        'group block rounded-xl border border-border bg-card p-5 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 hover:bg-muted hover:-translate-y-0.5',
        className
      )}
    >
      {/* 头部：名称 + 状态 */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <h3 className="font-semibold text-sm leading-snug line-clamp-1 group-hover:text-primary transition-colors">{template.name}</h3>
        <StatusBadge status={template.status} />
      </div>

      {/* 描述 */}
      {template.description && (
        <p className="text-xs text-muted-foreground/80 line-clamp-2 mb-4 leading-relaxed">
          {template.description}
        </p>
      )}

      {/* 结构时间线（紧凑模式） */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] text-muted-foreground/60 font-medium uppercase tracking-wider">场景结构</span>
          {template.structure.length > 0 && template.structure.reduce((sum, s) => sum + (s.durationSec || 0), 0) > 0 && (
            <span className="text-[10px] text-muted-foreground/50">
              {template.structure.reduce((sum, s) => sum + (s.durationSec || 0), 0)}s
            </span>
          )}
        </div>
        <TemplateStructureTimeline scenes={template.structure} compact />
      </div>

      {/* Hook 类型标签 */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {template.hookPattern && (
          <span className="inline-flex items-center rounded-md bg-purple-500/10 dark:bg-purple-500/15 px-2 py-0.5 text-[11px] font-medium text-purple-700 dark:text-purple-300 ring-1 ring-purple-500/20">
            {template.hookPattern}
          </span>
        )}
        {template.style && (
          <span className="inline-flex items-center rounded-md bg-blue-500/10 dark:bg-blue-500/15 px-2 py-0.5 text-[11px] font-medium text-blue-700 dark:text-blue-300 ring-1 ring-blue-500/20">
            {template.style}
          </span>
        )}
        {template.targetEmotion && (
          <span className="inline-flex items-center rounded-md bg-orange-500/10 dark:bg-orange-500/15 px-2 py-0.5 text-[11px] font-medium text-orange-700 dark:text-orange-300 ring-1 ring-orange-500/20">
            {template.targetEmotion}
          </span>
        )}
      </div>

      {/* 底部统计 */}
      <div className="flex items-center justify-between text-[11px] text-muted-foreground/70 pt-3 border-t border-border/40">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <Zap className="w-3 h-3" />
            {template.structure.length} 场景
          </span>
          {template.recommendedDuration && (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {template.recommendedDuration}s
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <BarChart3 className="w-3 h-3" />
            {template.usageCount > 0 ? `${template.usageCount}次` : '新模版'}
          </span>
          <span className="flex items-center gap-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={cn(
                  'w-3 h-3',
                  i < scoreStars
                    ? 'fill-amber-400 text-amber-400'
                    : 'text-muted-foreground/20'
                )}
              />
            ))}
          </span>
        </div>
      </div>
    </Link>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    active: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
    archived: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
  };

  const labels: Record<string, string> = {
    draft: '草稿',
    active: '启用',
    archived: '归档',
  };

  return (
    <span className={cn(
      'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium shrink-0',
      styles[status] || styles.draft
    )}>
      {labels[status] || status}
    </span>
  );
}
