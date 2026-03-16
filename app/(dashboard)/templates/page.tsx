'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { TemplateCard } from '@/components/templates/template-card';
import { TemplateExtractDialog } from '@/components/templates/template-extract-dialog';
import { TemplateMatchPanel } from '@/components/templates/template-match-panel';
import type { MaterialTemplate } from '@/data/template.schema';
import { Loader2, Sparkles, LayoutTemplate, Search } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import T from '@/lib/theme';

/* ── 样式常量 ── */
const S = {
    content: { flex: 1, overflowY: 'auto' as const, padding: `${T.space.lg}px ${T.space['2xl']}px` },
    toolbar: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: T.space.xl },
    viewToggle: { display: 'flex', borderRadius: T.radius.lg, border: `1px solid ${T.border}`, overflow: 'hidden' },
    viewBtn: (active: boolean) => ({
        padding: '8px 16px',
        fontSize: T.fontSize.sm,
        fontWeight: T.fontWeight.medium,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        cursor: 'pointer',
        transition: T.transition.fast,
        border: 'none',
        background: active ? T.text.primary : 'transparent',
        color: active ? T.text.inverse : T.text.tertiary,
    }),
    filterPills: { display: 'flex', gap: 6 },
    pill: (active: boolean) => ({
        padding: '6px 14px',
        borderRadius: T.radius.full,
        fontSize: T.fontSize.xs,
        cursor: 'pointer',
        transition: T.transition.fast,
        ...(active ? T.pill.active : T.pill.inactive),
    }),
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: T.space.xl },
    loading: { display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 0', color: T.text.tertiary },
    extractBtn: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 16px',
        borderRadius: T.radius.lg,
        background: T.text.primary,
        color: T.text.inverse,
        fontSize: T.fontSize.sm,
        fontWeight: T.fontWeight.semibold,
        cursor: 'pointer',
        border: 'none',
        transition: T.transition.fast,
    },
    emptyWrap: { display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center', padding: '80px 0', textAlign: 'center' as const },
    emptyIcon: { width: 64, height: 64, borderRadius: T.radius.xl, background: 'rgba(249,115,22,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: T.space.lg },
    emptyTitle: { fontSize: T.fontSize.lg, fontWeight: T.fontWeight.semibold, color: T.text.primary, marginBottom: T.space.sm },
    emptyDesc: { fontSize: T.fontSize.sm, color: T.text.tertiary, maxWidth: 400, marginBottom: T.space['2xl'] },
    emptyActions: { display: 'flex', gap: T.space.md },
    outlineBtn: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 16px',
        borderRadius: T.radius.lg,
        border: `1px solid ${T.border}`,
        background: 'transparent',
        color: T.text.secondary,
        fontSize: T.fontSize.sm,
        fontWeight: T.fontWeight.medium,
        cursor: 'pointer',
        transition: T.transition.fast,
        textDecoration: 'none',
    },
} as const;

type FilterStatus = 'all' | 'draft' | 'active' | 'archived';
type ViewMode = 'browse' | 'match';

export default function TemplatesPage() {
  const searchParams = useSearchParams();
  const matchText = searchParams.get('match') || '';

  const [templates, setTemplates] = useState<MaterialTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [viewMode, setViewMode] = useState<ViewMode>(matchText ? 'match' : 'browse');
  const [showExtractDialog, setShowExtractDialog] = useState(false);

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStatus !== 'all') params.set('status', filterStatus);

      const res = await fetch(`/api/templates?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setTemplates(data.templates || []);
      }
    } catch (error) {
      console.error('获取模版列表失败:', error);
    } finally {
      setLoading(false);
    }
  }, [filterStatus]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const handleExtractSuccess = () => {
    fetchTemplates();
  };

  return (
    <>
      <PageHeader
        title="爆款模版"
        actions={
          <button onClick={() => setShowExtractDialog(true)} style={S.extractBtn}>
            <Sparkles style={{ width: 16, height: 16 }} />
            AI 提取模版
          </button>
        }
      />

      <div style={S.content}>
        {/* 视图切换 + 筛选 */}
        <div style={S.toolbar}>
          <div style={S.viewToggle}>
            <button onClick={() => setViewMode('browse')} style={S.viewBtn(viewMode === 'browse')}>
              <LayoutTemplate style={{ width: 16, height: 16 }} />
              浏览
            </button>
            <button onClick={() => setViewMode('match')} style={S.viewBtn(viewMode === 'match')}>
              <Search style={{ width: 16, height: 16 }} />
              智能匹配
            </button>
          </div>

          {viewMode === 'browse' && (
            <div style={S.filterPills}>
              {(['all', 'active', 'draft', 'archived'] as FilterStatus[]).map((status) => (
                <button key={status} onClick={() => setFilterStatus(status)} style={S.pill(filterStatus === status)}>
                  {status === 'all' ? '全部' : status === 'active' ? '启用' : status === 'draft' ? '草稿' : '归档'}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 内容区 */}
        {viewMode === 'match' ? (
          <div style={{ maxWidth: 640 }}>
            <TemplateMatchPanel
              initialText={matchText}
              onSelect={(template) => {
                window.location.href = `/studio?templateId=${template.id}`;
              }}
            />
          </div>
        ) : loading ? (
          <div style={S.loading}>
            <Loader2 style={{ width: 32, height: 32 }} className="animate-spin" />
          </div>
        ) : templates.length === 0 ? (
          <EmptyState onExtract={() => setShowExtractDialog(true)} />
        ) : (
          <div style={S.grid}>
            {templates.map((template) => (
              <TemplateCard key={template.id} template={template} />
            ))}
          </div>
        )}

        {/* AI 提取对话框 */}
        {showExtractDialog && (
          <TemplateExtractDialog
            materialIds={[]}
            onClose={() => setShowExtractDialog(false)}
            onSuccess={handleExtractSuccess}
          />
        )}
      </div>
    </>
  );
}

function EmptyState({ onExtract }: { onExtract: () => void }) {
  return (
    <div style={S.emptyWrap}>
      <div style={S.emptyIcon}>
        <LayoutTemplate style={{ width: 32, height: 32, color: '#a78bfa' }} />
      </div>
      <h3 style={S.emptyTitle}>还没有爆款模版</h3>
      <p style={S.emptyDesc}>
        从素材库中选择高消耗爆款素材，让 AI 分析共性特征，提炼出可复用的创意公式。
      </p>
      <div style={S.emptyActions}>
        <button onClick={onExtract} style={S.extractBtn}>
          <Sparkles style={{ width: 16, height: 16 }} />
          AI 提取模版
        </button>
        <a href="/materials" style={S.outlineBtn}>
          前往素材库
        </a>
      </div>
    </div>
  );
}
