'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Lightbulb, Loader2, FileSpreadsheet } from 'lucide-react';
import { InspirationCard } from '@/components/inspirations/inspiration-card';
import { CreateInspirationDialog } from '@/components/inspirations/create-inspiration-dialog';
import { EditInspirationDialog } from '@/components/inspirations/edit-inspiration-dialog';
import { ImportExcelDialog } from '@/components/inspirations/import-excel-dialog';
import type { Inspiration } from '@/data/inspiration.schema';

/* ── 样式常量 ── */

const S = {
  page: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
    overflow: 'hidden',
    background: '#000',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 56,
    padding: '0 24px',
    flexShrink: 0,
    borderBottom: '1px solid rgba(255,255,255,0.06)',
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
    color: 'rgba(255,255,255,0.6)',
    flexShrink: 0,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 600 as const,
    color: 'rgba(255,255,255,0.88)',
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
    color: '#000',
    background: '#fff',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
    transition: 'opacity 0.15s ease',
    flexShrink: 0,
  },
  filterBar: {
    padding: '12px 24px',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
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
    color: 'rgba(255,255,255,0.25)',
    pointerEvents: 'none' as const,
  },
  searchInput: {
    width: '100%',
    height: 38,
    paddingLeft: 36,
    paddingRight: 16,
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    background: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: 'rgba(255,255,255,0.06)',
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
    color: active ? '#000' : 'rgba(255,255,255,0.4)',
    background: active ? '#fff' : 'rgba(255,255,255,0.04)',
    border: active ? 'none' : '1px solid rgba(255,255,255,0.06)',
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
    paddingTop: 80,
    paddingBottom: 80,
    textAlign: 'center' as const,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    background: 'rgba(255,255,255,0.04)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: 600 as const,
    color: 'rgba(255,255,255,0.7)',
    margin: 0,
    marginBottom: 6,
  },
  emptyDesc: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.3)',
    maxWidth: 320,
    lineHeight: 1.5,
    margin: 0,
  },
  emptyCTA: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    marginTop: 24,
    padding: '10px 20px',
    fontSize: 13,
    fontWeight: 600 as const,
    color: '#000',
    background: '#fff',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
    transition: 'opacity 0.15s ease',
  },
  pagination: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginTop: 24,
    paddingTop: 16,
    borderTop: '1px solid rgba(255,255,255,0.06)',
  },
  pageBtn: (disabled: boolean) => ({
    padding: '6px 14px',
    fontSize: 13,
    fontWeight: 500 as const,
    color: disabled ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.6)',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 6,
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'all 0.15s ease',
  }),
  pageInfo: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.3)',
  },
} as const;

/* ── 响应式 CSS（瀑布流列数） ── */

const MASONRY_CSS = `
.insp-masonry{column-count:1;column-gap:16px}
@media(min-width:640px){.insp-masonry{column-count:2}}
@media(min-width:1024px){.insp-masonry{column-count:3}}
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

  useEffect(() => {
    fetchInspirations();
  }, [fetchInspirations]);

  // 搜索 debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchInspirations(true);
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, activeTag, activeStatus]);

  // 删除灵感
  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/inspirations/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setInspirations(prev => prev.filter(i => i.id !== id));
      }
    } catch (error) {
      console.error('删除失败:', error);
    }
  };

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
              color: 'rgba(255,255,255,0.6)',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
            onClick={() => setShowImport(true)}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
          >
            <FileSpreadsheet style={{ width: 14, height: 14 }} />
            导入
          </button>
          <button
            style={S.addBtn}
            onClick={() => setShowCreate(true)}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.85'; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
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
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={S.searchInput}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
              e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
              e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
            }}
          />
        </div>

        {/* 状态筛选 */}
        <div style={{ ...S.tagRow, marginTop: 10 }}>
          {[
            { key: null, label: '全部' },
            { key: 'new', label: '新' },
            { key: 'used', label: '已用' },
            { key: 'archived', label: '归档' },
          ].map(({ key, label }) => (
            <button
              key={label}
              onClick={() => setActiveStatus(key)}
              style={S.tagPill(activeStatus === key)}
            >
              {label}
            </button>
          ))}
        </div>

        {allTags.length > 0 && (
          <div style={S.tagRow}>
            <button
              onClick={() => setActiveTag(null)}
              style={S.tagPill(!activeTag)}
            >
              全部
            </button>
            {allTags.map(tag => (
              <button
                key={tag}
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
            <Loader2 style={{ width: 24, height: 24, color: 'rgba(255,255,255,0.2)', animation: 'spin 1s linear infinite' }} />
          </div>
        ) : inspirations.length === 0 ? (
          <div style={S.emptyState}>
            <div style={S.emptyIcon}>
              <Lightbulb style={{ width: 28, height: 28, color: 'rgba(255,255,255,0.2)' }} />
            </div>
            <h3 style={S.emptyTitle}>
              {isFiltering ? '未找到匹配的灵感' : '还没有灵感记录'}
            </h3>
            <p style={S.emptyDesc}>
              {isFiltering ? '试试其他搜索词或标签' : '随时记录你的创意灵感，文字、语音、图片都可以'}
            </p>
            {!isFiltering && (
              <button
                style={S.emptyCTA}
                onClick={() => setShowCreate(true)}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.85'; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
              >
                记录第一个灵感
              </button>
            )}
          </div>
        ) : (
          <>
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

      {/* Spin animation */}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
