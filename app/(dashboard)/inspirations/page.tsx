'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Search, Lightbulb, Loader2, FileSpreadsheet, Sparkles, ArrowRight, Send } from 'lucide-react';
import { InspirationCard } from '@/components/inspirations/inspiration-card';
import { CreateInspirationDialog } from '@/components/inspirations/create-inspiration-dialog';
import { EditInspirationDialog } from '@/components/inspirations/edit-inspiration-dialog';
import { ImportExcelDialog } from '@/components/inspirations/import-excel-dialog';
import type { Inspiration } from '@/data/inspiration.schema';

/* ── 样式常量（使用 CSS 变量，支持亮色/暗色主题） ── */

const S = {
  page: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
    overflow: 'hidden',
    background: 'hsl(var(--background))',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 56,
    padding: '0 24px',
    flexShrink: 0,
    borderBottom: '1px solid hsl(var(--border))',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    minWidth: 0,
  },
  headerIcon: {
    width: 20,
    height: 20,
    color: 'hsl(var(--muted-foreground))',
    flexShrink: 0,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 600 as const,
    color: 'hsl(var(--foreground))',
    margin: 0,
    whiteSpace: 'nowrap' as const,
  },
  addBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '7px 14px',
    fontSize: 13,
    fontWeight: 500 as const,
    color: '#fff',
    background: '#F97316',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
    transition: 'opacity 0.15s ease',
    flexShrink: 0,
  },
  filterBar: {
    padding: '12px 24px',
    borderBottom: '1px solid hsl(var(--border))',
    flexShrink: 0,
  },
  searchWrap: {
    position: 'relative' as const,
  },
  searchIcon: {
    position: 'absolute' as const,
    left: 12,
    top: '50%',
    transform: 'translateY(-50%)',
    width: 16,
    height: 16,
    color: 'hsl(var(--muted-foreground) / 0.5)',
    pointerEvents: 'none' as const,
  },
  searchInput: {
    width: '100%',
    height: 38,
    paddingLeft: 36,
    paddingRight: 16,
    fontSize: 13,
    color: 'hsl(var(--foreground))',
    background: 'hsl(var(--muted))',
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: 'hsl(var(--border))',
    borderRadius: 8,
    outline: 'none',
    transition: 'border-color 0.15s ease, background 0.15s ease',
  },
  tagRow: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: 8,
    marginTop: 10,
  },
  tagPill: (active: boolean) => ({
    padding: '5px 12px',
    fontSize: 12,
    fontWeight: 500 as const,
    color: active ? 'hsl(var(--background))' : 'hsl(var(--muted-foreground))',
    background: active ? 'hsl(var(--foreground))' : 'hsl(var(--muted))',
    border: active ? 'none' : '1px solid hsl(var(--border))',
    borderRadius: 100,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  }),
  content: {
    flex: 1,
    overflowY: 'auto' as const,
    padding: 24,
  },
  loader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    paddingBottom: 80,
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 48,
    paddingBottom: 80,
    textAlign: 'center' as const,
  },
  emptyIllustration: {
    width: 200,
    height: 160,
    marginBottom: 24,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative' as const,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 600 as const,
    color: 'hsl(var(--foreground))',
    margin: 0,
    marginBottom: 8,
  },
  emptyDesc: {
    fontSize: 14,
    color: 'hsl(var(--muted-foreground))',
    maxWidth: 400,
    lineHeight: 1.6,
    margin: 0,
    marginBottom: 32,
  },
  quickInputWrap: {
    display: 'flex',
    gap: 8,
    width: '100%',
    maxWidth: 520,
    marginBottom: 24,
  },
  quickInput: {
    flex: 1,
    height: 44,
    padding: '0 16px',
    fontSize: 14,
    color: 'hsl(var(--foreground))',
    background: 'hsl(var(--muted))',
    border: '1px solid hsl(var(--border))',
    borderRadius: 10,
    outline: 'none',
    transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
  },
  quickSubmitBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: '0 20px',
    height: 44,
    fontSize: 14,
    fontWeight: 600 as const,
    color: '#fff',
    background: '#F97316',
    border: 'none',
    borderRadius: 10,
    cursor: 'pointer',
    transition: 'opacity 0.15s ease, transform 0.1s ease',
    flexShrink: 0,
  },
  emptySteps: {
    display: 'flex',
    gap: 16,
    marginTop: 12,
    flexWrap: 'wrap' as const,
    justifyContent: 'center',
  },
  emptyStepCard: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '12px 16px',
    background: 'hsl(var(--muted))',
    border: '1px solid hsl(var(--border))',
    borderRadius: 10,
    fontSize: 13,
    color: 'hsl(var(--muted-foreground))',
  },
  emptyStepIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 14,
    flexShrink: 0,
  },
  pagination: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginTop: 24,
    paddingTop: 16,
    borderTop: '1px solid hsl(var(--border))',
  },
  pageBtn: (disabled: boolean) => ({
    padding: '6px 14px',
    fontSize: 13,
    fontWeight: 500 as const,
    color: disabled ? 'hsl(var(--muted-foreground) / 0.3)' : 'hsl(var(--muted-foreground))',
    background: 'hsl(var(--muted))',
    border: '1px solid hsl(var(--border))',
    borderRadius: 6,
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'all 0.15s ease',
  }),
  pageInfo: {
    fontSize: 12,
    color: 'hsl(var(--muted-foreground) / 0.6)',
  },
} as const;

/* ── 响应式 CSS（瀑布流列数 + 动画） ── */

const MASONRY_CSS = `
.insp-masonry{column-count:1;column-gap:16px}
@media(min-width:640px){.insp-masonry{column-count:2}}
@media(min-width:1024px){.insp-masonry{column-count:3}}
@keyframes insp-spin{to{transform:rotate(360deg)}}
@keyframes insp-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
`;

export default function InspirationsPage() {
  const [inspirations, setInspirations] = useState<Inspiration[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [activeStatus, setActiveStatus] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [editingInspiration, setEditingInspiration] = useState<Inspiration | null>(null);
  const [quickText, setQuickText] = useState('');
  const [quickSubmitting, setQuickSubmitting] = useState(false);
  const [quickError, setQuickError] = useState<string | null>(null);

  // 标记是否初次加载（避免 debounce useEffect 和初始 useEffect 双重触发）
  const isInitialMount = useRef(true);

  // 快速创建灵感
  const handleQuickCreate = useCallback(async () => {
    const text = quickText.trim();
    if (!text || quickSubmitting) return;
    setQuickError(null);
    try {
      setQuickSubmitting(true);
      const res = await fetch('/api/inspirations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: text, description: '', tags: [] }),
      });
      if (res.ok) {
        setQuickText('');
        fetchInspirations(true);
      } else {
        setQuickError('创建失败，请重试');
      }
    } catch {
      setQuickError('网络错误，请检查连接');
    } finally {
      setQuickSubmitting(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quickText, quickSubmitting]);

  // 获取所有标签
  const allTags = Array.from(
    new Set(inspirations.flatMap(i => i.tags || []))
  ).slice(0, 20);

  // 获取灵感列表
  const fetchInspirations = useCallback(async (resetPage = false) => {
    try {
      setLoading(true);
      const currentPage = resetPage ? 1 : page;
      const params = new URLSearchParams({
        page: currentPage.toString(),
        pageSize: '20',
      });
      if (search) params.set('search', search);
      if (activeTag) params.set('tag', activeTag);
      if (activeStatus) params.set('status', activeStatus);

      const res = await fetch(`/api/inspirations?${params}`);
      if (res.ok) {
        const data = await res.json();
        setInspirations(data.inspirations || []);
        setTotalPages(data.totalPages || 1);
        if (resetPage) setPage(1);
      }
    } catch (error) {
      console.error('获取灵感列表失败:', error);
    } finally {
      setLoading(false);
    }
  }, [page, search, activeTag, activeStatus]);

  // 初始加载 + page 变化时获取数据
  useEffect(() => {
    fetchInspirations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  // 搜索/筛选 debounce（跳过初次加载，避免与上方 useEffect 双重触发）
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    const timer = setTimeout(() => {
      fetchInspirations(true);
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, activeTag, activeStatus]);

  // 删除灵感
  const handleDelete = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/inspirations/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setInspirations(prev => prev.filter(i => i.id !== id));
      }
    } catch (error) {
      console.error('删除失败:', error);
    }
  }, []);

  const isFiltering = !!(search || activeTag || activeStatus);

  return (
    <div style={S.page}>
      <style>{MASONRY_CSS}</style>

      {/* 顶部栏 */}
      <div style={S.header}>
        <div style={S.headerLeft}>
          <Lightbulb style={S.headerIcon} />
          <h1 style={S.headerTitle}>灵感收集</h1>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            style={{
              ...S.addBtn,
              color: 'hsl(var(--muted-foreground))',
              background: 'hsl(var(--muted))',
              border: '1px solid hsl(var(--border))',
            }}
            onClick={() => setShowImport(true)}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'hsl(var(--border))'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'hsl(var(--muted))'; }}
            onFocus={(e) => { e.currentTarget.style.outline = '2px solid hsl(var(--ring))'; e.currentTarget.style.outlineOffset = '2px'; }}
            onBlur={(e) => { e.currentTarget.style.outline = 'none'; }}
          >
            <FileSpreadsheet style={{ width: 14, height: 14 }} />
            导入
          </button>
          <button
            style={S.addBtn}
            onClick={() => setShowCreate(true)}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.85'; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
            onFocus={(e) => { e.currentTarget.style.outline = '2px solid hsl(var(--ring))'; e.currentTarget.style.outlineOffset = '2px'; }}
            onBlur={(e) => { e.currentTarget.style.outline = 'none'; }}
          >
            <Plus style={{ width: 14, height: 14 }} />
            记录灵感
          </button>
        </div>
      </div>

      {/* 搜索和标签筛选 */}
      <div style={S.filterBar}>
        <div style={S.searchWrap}>
          <Search style={S.searchIcon} />
          <input
            type="text"
            placeholder="搜索灵感..."
            aria-label="搜索灵感"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={S.searchInput}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = 'hsl(var(--ring))';
              e.currentTarget.style.boxShadow = '0 0 0 2px hsl(var(--ring) / 0.2)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = 'hsl(var(--border))';
              e.currentTarget.style.boxShadow = 'none';
            }}
          />
        </div>

        {/* 状态筛选 */}
        <div style={{ ...S.tagRow, marginTop: 10 }} role="tablist" aria-label="状态筛选">
          {[
            { key: null, label: '全部' },
            { key: 'new', label: '新' },
            { key: 'used', label: '已用' },
            { key: 'archived', label: '归档' },
          ].map(({ key, label }) => (
            <button
              key={label}
              role="tab"
              aria-selected={activeStatus === key}
              onClick={() => setActiveStatus(key)}
              style={S.tagPill(activeStatus === key)}
            >
              {label}
            </button>
          ))}
        </div>

        {allTags.length > 0 && (
          <div style={S.tagRow} role="tablist" aria-label="标签筛选">
            <button
              role="tab"
              aria-selected={!activeTag}
              onClick={() => setActiveTag(null)}
              style={S.tagPill(!activeTag)}
            >
              全部
            </button>
            {allTags.map(tag => (
              <button
                key={tag}
                role="tab"
                aria-selected={activeTag === tag}
                onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                style={S.tagPill(activeTag === tag)}
              >
                {tag}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 灵感列表 */}
      <div style={S.content}>
        {loading ? (
          <div style={S.loader}>
            <Loader2 style={{ width: 24, height: 24, color: 'hsl(var(--muted-foreground) / 0.4)', animation: 'insp-spin 1s linear infinite' }} />
          </div>
        ) : inspirations.length === 0 ? (
          <div style={S.emptyState}>
            {isFiltering ? (
              <>
                <Lightbulb style={{ width: 48, height: 48, color: 'hsl(var(--muted-foreground) / 0.2)', marginBottom: 20 }} />
                <h3 style={S.emptyTitle}>未找到匹配的灵感</h3>
                <p style={S.emptyDesc}>试试其他搜索词或标签</p>
              </>
            ) : (
              <>
                {/* 灵动插画区域 */}
                <div style={S.emptyIllustration}>
                  <div style={{
                    width: 80, height: 80, borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(249,115,22,0.15) 0%, rgba(249,115,22,0.03) 70%, transparent 100%)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    position: 'relative',
                  }}>
                    <Sparkles style={{ width: 36, height: 36, color: '#F97316', opacity: 0.8 }} />
                    <div style={{
                      position: 'absolute', top: -8, right: -16,
                      width: 20, height: 20, borderRadius: '50%',
                      background: 'rgba(249,115,22,0.12)',
                      animation: 'insp-float 3s ease-in-out infinite',
                    }} />
                    <div style={{
                      position: 'absolute', bottom: -4, left: -20,
                      width: 14, height: 14, borderRadius: '50%',
                      background: 'rgba(249,115,22,0.08)',
                      animation: 'insp-float 3s ease-in-out 1.5s infinite',
                    }} />
                  </div>
                </div>

                <h3 style={S.emptyTitle}>记录你的每一个灵感火花</h3>
                <p style={S.emptyDesc}>
                  好创意稍纵即逝 — 在这里随手记录，看着它们一步步变成爆款素材
                </p>

                {/* 快速输入框 */}
                <div style={S.quickInputWrap}>
                  <input
                    type="text"
                    placeholder="脑海里闪过什么想法？先记下来..."
                    aria-label="快速记录灵感"
                    value={quickText}
                    onChange={(e) => { setQuickText(e.target.value); setQuickError(null); }}
                    onKeyDown={(e) => e.key === 'Enter' && handleQuickCreate()}
                    style={S.quickInput}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = '#F97316';
                      e.currentTarget.style.boxShadow = '0 0 0 2px rgba(249,115,22,0.15)';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = 'hsl(var(--border))';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  />
                  <button
                    style={{
                      ...S.quickSubmitBtn,
                      opacity: quickText.trim() ? 1 : 0.5,
                      cursor: quickText.trim() ? 'pointer' : 'default',
                    }}
                    onClick={handleQuickCreate}
                    disabled={!quickText.trim() || quickSubmitting}
                    onMouseEnter={(e) => { if (quickText.trim()) e.currentTarget.style.opacity = '0.9'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.opacity = quickText.trim() ? '1' : '0.5'; }}
                  >
                    {quickSubmitting ? (
                      <Loader2 style={{ width: 16, height: 16, animation: 'insp-spin 1s linear infinite' }} />
                    ) : (
                      <Send style={{ width: 16, height: 16 }} />
                    )}
                    记录
                  </button>
                </div>

                {/* 错误提示 */}
                {quickError && (
                  <div style={{ color: 'hsl(var(--destructive))', fontSize: 13, marginBottom: 16 }}>
                    {quickError}
                  </div>
                )}

                {/* 或者详细记录 */}
                <button
                  style={{
                    background: 'none', border: 'none', color: 'hsl(var(--muted-foreground) / 0.6)',
                    fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                    marginBottom: 32, transition: 'color 0.15s',
                  }}
                  onClick={() => setShowCreate(true)}
                  onMouseEnter={(e) => { e.currentTarget.style.color = '#F97316'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = 'hsl(var(--muted-foreground) / 0.6)'; }}
                >
                  <Plus style={{ width: 14, height: 14 }} />
                  想详细记录？点这里添加标签和描述
                </button>

                {/* 流程引导 */}
                <div style={S.emptySteps}>
                  {[
                    { icon: '💡', label: '记录灵感', bg: 'rgba(249,115,22,0.1)' },
                    { icon: '📋', label: '匹配模版', bg: 'rgba(96,165,250,0.1)' },
                    { icon: '🎬', label: 'AI 创作', bg: 'rgba(168,85,247,0.1)' },
                    { icon: '🚀', label: '审核投放', bg: 'rgba(34,197,94,0.1)' },
                  ].map((step, i) => (
                    <div key={step.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={S.emptyStepCard}>
                        <div style={{ ...S.emptyStepIcon, background: step.bg }}>
                          {step.icon}
                        </div>
                        {step.label}
                      </div>
                      {i < 3 && <ArrowRight style={{ width: 14, height: 14, color: 'hsl(var(--muted-foreground) / 0.2)' }} />}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        ) : (
          <>
            {/* 快速输入 - 列表视图也有 */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <input
                type="text"
                placeholder="快速记录一个灵感..."
                aria-label="快速记录灵感"
                value={quickText}
                onChange={(e) => { setQuickText(e.target.value); setQuickError(null); }}
                onKeyDown={(e) => e.key === 'Enter' && handleQuickCreate()}
                style={{
                  flex: 1, height: 40, padding: '0 14px', fontSize: 13,
                  color: 'hsl(var(--foreground))', background: 'hsl(var(--muted))',
                  border: '1px solid hsl(var(--border))', borderRadius: 8, outline: 'none',
                  transition: 'border-color 0.2s ease',
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = '#F97316'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = 'hsl(var(--border))'; }}
              />
              <button
                style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  padding: '0 14px', height: 40, fontSize: 13, fontWeight: 500,
                  color: '#fff', background: quickText.trim() ? '#F97316' : 'hsl(var(--muted))',
                  border: 'none', borderRadius: 8, cursor: quickText.trim() ? 'pointer' : 'default',
                  transition: 'all 0.15s ease',
                }}
                onClick={handleQuickCreate}
                disabled={!quickText.trim() || quickSubmitting}
              >
                {quickSubmitting ? (
                  <Loader2 style={{ width: 14, height: 14, animation: 'insp-spin 1s linear infinite' }} />
                ) : (
                  <Send style={{ width: 14, height: 14 }} />
                )}
              </button>
            </div>
            {/* 错误提示 */}
            {quickError && (
              <div style={{ color: 'hsl(var(--destructive))', fontSize: 13, marginBottom: 12 }}>
                {quickError}
              </div>
            )}
            <div className="insp-masonry">
              {inspirations.map(inspiration => (
                <InspirationCard
                  key={inspiration.id}
                  inspiration={inspiration}
                  onDelete={handleDelete}
                  onEdit={setEditingInspiration}
                />
              ))}
            </div>

            {/* 分页 */}
            {totalPages > 1 && (
              <div style={S.pagination}>
                <button
                  style={S.pageBtn(page <= 1)}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page <= 1}
                >
                  上一页
                </button>
                <span style={S.pageInfo}>
                  {page} / {totalPages}
                </span>
                <button
                  style={S.pageBtn(page >= totalPages)}
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                >
                  下一页
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* 创建灵感对话框 */}
      <CreateInspirationDialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={() => fetchInspirations(true)}
      />

      {/* 编辑灵感对话框 */}
      {editingInspiration && (
        <EditInspirationDialog
          open={!!editingInspiration}
          inspiration={editingInspiration}
          onClose={() => setEditingInspiration(null)}
          onUpdated={() => {
            setEditingInspiration(null);
            fetchInspirations();
          }}
        />
      )}

      {/* 导入 Excel 对话框 */}
      <ImportExcelDialog
        open={showImport}
        onClose={() => setShowImport(false)}
        onImported={() => fetchInspirations(true)}
      />
    </div>
  );
}
