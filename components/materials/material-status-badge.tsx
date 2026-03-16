'use client';

import { MATERIAL_STATUS_LABELS, MATERIAL_STATUS_COLORS } from '@/data/material.schema';

interface MaterialStatusBadgeProps {
  status?: string;
  className?: string;
}

export function MaterialStatusBadge({ status, className = '' }: MaterialStatusBadgeProps) {
  const s = status || 'draft';
  const label = MATERIAL_STATUS_LABELS[s] || s;
  const colorClass = MATERIAL_STATUS_COLORS[s] || 'text-muted-foreground bg-muted';

  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${colorClass} ${className}`}
    >
      {label}
    </span>
  );
}
