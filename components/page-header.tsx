'use client';

import { type ReactNode } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import T from '@/lib/theme';

/* ── 样式常量 ── */
const S = {
    header: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 56,
        padding: '0 24px',
        background: T.bg.page,
        borderBottom: `1px solid ${T.border}`,
        position: 'sticky' as const,
        top: 0,
        zIndex: 10,
        flexShrink: 0,
    },
    left: {
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        minWidth: 0,
    },
    backBtn: {
        flexShrink: 0,
        padding: 6,
        marginLeft: -6,
        borderRadius: T.radius.lg,
        background: 'transparent',
        border: 'none',
        color: T.text.tertiary,
        cursor: 'pointer',
        transition: T.transition.fast,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: {
        fontSize: T.fontSize.lg,
        fontWeight: T.fontWeight.semibold,
        color: T.text.primary,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap' as const,
        margin: 0,
    },
    badge: {
        fontSize: T.fontSize['2xs'],
        padding: '1px 6px',
        borderRadius: T.radius.sm,
        background: T.bg.hover,
        color: T.text.tertiary,
        flexShrink: 0,
        fontWeight: T.fontWeight.medium,
    },
    description: {
        fontSize: T.fontSize.xs,
        color: T.text.tertiary,
        marginLeft: 4,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap' as const,
    },
    actions: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        flexShrink: 0,
        marginLeft: 16,
    },
} as const;

interface PageHeaderProps {
  title: string;
  description?: string;
  badge?: string;
  badgeVariant?: 'default' | 'secondary' | 'outline';
  icon?: LucideIcon;
  backHref?: string;
  actions?: ReactNode;
}

export function PageHeader({ title, description, badge, icon: Icon, backHref, actions }: PageHeaderProps) {
  return (
    <header style={S.header}>
      <div style={S.left}>
        {backHref && (
          <Link href={backHref} style={{ textDecoration: 'none' }}>
            <span style={S.backBtn}>
              <ArrowLeft style={{ width: 16, height: 16 }} />
            </span>
          </Link>
        )}
        {Icon && (
          <Icon style={{ width: 20, height: 20, color: T.text.primary, flexShrink: 0 }} />
        )}
        <h1 style={S.title}>{title}</h1>
        {badge && <span style={S.badge}>{badge}</span>}
        {description && <span style={S.description}>· {description}</span>}
      </div>
      {actions && <div style={S.actions}>{actions}</div>}
    </header>
  );
}
