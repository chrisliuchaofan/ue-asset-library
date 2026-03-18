'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Trash2, Mic, ImageIcon, Video, MoreHorizontal, Tag, Pencil, Sparkles, ExternalLink } from 'lucide-react';
import type { Inspiration } from '@/data/inspiration.schema';

interface InspirationCardProps {
  inspiration: Inspiration;
  onDelete?: (id: string) => void;
  onEdit?: (inspiration: Inspiration) => void;
}

/* ── 样式常量 ── */

const S = {
  card: {
    position: 'relative' as const,
    background: 'rgba(255,255,255,0.02)',
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    breakInside: 'avoid' as const,
    transition: 'background 0.2s ease, border-color 0.2s ease',
    cursor: 'default',
  },
  cardHover: {
    background: 'rgba(255,255,255,0.04)',
    borderColor: 'rgba(255,255,255,0.1)',
  },
  metaRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  metaLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 11,
    color: 'rgba(255,255,255,0.3)',
  },
  menuBtn: {
    padding: 4,
    borderRadius: 6,
    border: 'none',
    background: 'transparent',
    color: 'rgba(255,255,255,0.3)',
    cursor: 'pointer',
    transition: 'opacity 0.15s ease, background 0.15s ease',
  },
  dropdown: {
    position: 'absolute' as const,
    right: 0,
    top: '100%',
    marginTop: 4,
    zIndex: 20,
    background: '#1a1a1a',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 8,
    boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
    padding: '4px 0',
    minWidth: 120,
  },
  dropdownItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    width: '100%',
    padding: '8px 12px',
    fontSize: 13,
    color: '#ef4444',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    transition: 'background 0.1s ease',
  },
  title: {
    fontSize: 14,
    fontWeight: 600 as const,
    color: 'rgba(255,255,255,0.88)',
    lineHeight: 1.4,
    marginBottom: 8,
    display: '-webkit-box' as const,
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical' as const,
    overflow: 'hidden',
  },
  content: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.45)',
    lineHeight: 1.6,
    marginBottom: 14,
    whiteSpace: 'pre-wrap' as const,
    display: '-webkit-box' as const,
    WebkitLineClamp: 4,
    WebkitBoxOrient: 'vertical' as const,
    overflow: 'hidden',
  },
  mediaGrid: {
    display: 'grid',
    gap: 6,
    marginBottom: 12,
  },
  mediaItem: {
    position: 'relative' as const,
    aspectRatio: '1',
    borderRadius: 8,
    overflow: 'hidden',
    background: 'rgba(255,255,255,0.04)',
  },
  mediaPlaceholder: {
    position: 'absolute' as const,
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaOverlay: {
    position: 'absolute' as const,
    inset: 0,
    background: 'rgba(0,0,0,0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 13,
    fontWeight: 500 as const,
    color: 'rgba(255,255,255,0.8)',
  },
  voiceBar: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    padding: '8px 12px',
    borderRadius: 8,
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.06)',
  },
  tagRow: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: 6,
  },
  tag: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    padding: '3px 8px',
    borderRadius: 100,
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.06)',
  },
  statusBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '2px 7px',
    borderRadius: 100,
    fontSize: 10,
    fontWeight: 500 as const,
    lineHeight: '16px',
  },
  refLink: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    padding: '3px 8px',
    borderRadius: 6,
    fontSize: 11,
    color: '#60A5FA',
    background: 'rgba(96,165,250,0.08)',
    border: '1px solid rgba(96,165,250,0.15)',
    textDecoration: 'none',
    cursor: 'pointer',
    transition: 'background 0.15s ease',
    marginBottom: 10,
  },
} as const;

const STATUS_STYLES: Record<string, { color: string; bg: string; label: string; icon: string }> = {
  new: { color: '#F97316', bg: 'rgba(249,115,22,0.12)', label: '想法', icon: '💡' },
  used: { color: '#22C55E', bg: 'rgba(34,197,94,0.12)', label: '已落地', icon: '🎬' },
  archived: { color: 'rgba(255,255,255,0.35)', bg: 'rgba(255,255,255,0.05)', label: '归档', icon: '📦' },
};

export function InspirationCard({ inspiration, onDelete, onEdit }: InspirationCardProps) {
  const router = useRouter();
  const [showMenu, setShowMenu] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [imageError, setImageError] = useState<Set<string>>(new Set());

  const hasMedia = inspiration.media_urls && inspiration.media_urls.length > 0;
  const hasVoice = !!inspiration.voice_url;
  const hasTags = inspiration.tags && inspiration.tags.length > 0;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes} 分钟前`;
    if (hours < 24) return `${hours} 小时前`;
    if (days < 7) return `${days} 天前`;
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
  };

  const sourceLabel = () => {
    switch (inspiration.source) {
      case 'voice': return '语音';
      case 'camera': return '拍摄';
      default: return null;
    }
  };

  const mediaColCount = !hasMedia ? 1 :
    inspiration.media_urls.length === 1 ? 1 :
    inspiration.media_urls.length === 2 ? 2 : 3;

  return (
    <div
      style={{
        ...S.card,
        ...(hovered ? S.cardHover : {}),
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setShowMenu(false); }}
    >
      {/* 顶部：时间 + 来源 + 菜单 */}
      <div style={S.metaRow}>
        <div style={S.metaLeft}>
          {inspiration.source === 'voice' && <Mic style={{ width: 12, height: 12 }} />}
          {inspiration.source === 'camera' && <ImageIcon style={{ width: 12, height: 12 }} />}
          <span>{formatDate(inspiration.created_at)}</span>
          {sourceLabel() && (
            <span style={{ color: 'rgba(255,255,255,0.2)' }}>{sourceLabel()}</span>
          )}
          {inspiration.status && STATUS_STYLES[inspiration.status] && (
            <span style={{
              ...S.statusBadge,
              color: STATUS_STYLES[inspiration.status].color,
              background: STATUS_STYLES[inspiration.status].bg,
              gap: 3,
            }}>
              <span style={{ fontSize: 10 }}>{STATUS_STYLES[inspiration.status].icon}</span>
              {STATUS_STYLES[inspiration.status].label}
            </span>
          )}
        </div>
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowMenu(!showMenu)}
            style={{
              ...S.menuBtn,
              opacity: hovered ? 1 : 0,
            }}
          >
            <MoreHorizontal style={{ width: 16, height: 16 }} />
          </button>
          {showMenu && (
            <>
              <div
                style={{ position: 'fixed', inset: 0, zIndex: 10 }}
                onClick={() => setShowMenu(false)}
              />
              <div style={S.dropdown}>
                <button
                  onClick={() => {
                    onEdit?.(inspiration);
                    setShowMenu(false);
                  }}
                  style={{ ...S.dropdownItem, color: 'rgba(255,255,255,0.7)' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <Pencil style={{ width: 14, height: 14 }} />
                  编辑
                </button>
                <button
                  onClick={() => {
                    const text = encodeURIComponent(
                      (inspiration.title || '') + ' ' + (inspiration.content || '')
                    );
                    router.push(`/templates?match=${text}`);
                    setShowMenu(false);
                  }}
                  style={{ ...S.dropdownItem, color: '#F97316' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <Sparkles style={{ width: 14, height: 14 }} />
                  匹配模版
                </button>
                <button
                  onClick={() => {
                    onDelete?.(inspiration.id);
                    setShowMenu(false);
                  }}
                  style={S.dropdownItem}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <Trash2 style={{ width: 14, height: 14 }} />
                  删除
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 标题 */}
      {inspiration.title && (
        <h3 style={S.title}>{inspiration.title}</h3>
      )}

      {/* 内容 */}
      {inspiration.content && (
        <p style={S.content}>{inspiration.content}</p>
      )}

      {/* 媒体预览 */}
      {hasMedia && (
        <div style={{ ...S.mediaGrid, gridTemplateColumns: `repeat(${mediaColCount}, 1fr)` }}>
          {inspiration.media_urls.slice(0, 3).map((url, i) => {
            const isVideo = url.match(/\.(mp4|mov|webm)(\?|$)/i);
            return (
              <div key={i} style={S.mediaItem}>
                {isVideo ? (
                  <div style={S.mediaPlaceholder}>
                    <Video style={{ width: 28, height: 28, color: 'rgba(255,255,255,0.2)' }} />
                  </div>
                ) : imageError.has(url) ? (
                  <div style={S.mediaPlaceholder}>
                    <ImageIcon style={{ width: 28, height: 28, color: 'rgba(255,255,255,0.2)' }} />
                  </div>
                ) : (
                  <Image
                    src={url}
                    alt=""
                    fill
                    style={{ objectFit: 'cover' }}
                    sizes="200px"
                    onError={() => setImageError(prev => new Set(prev).add(url))}
                  />
                )}
                {i === 2 && inspiration.media_urls.length > 3 && (
                  <div style={S.mediaOverlay}>
                    +{inspiration.media_urls.length - 3}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 语音指示 */}
      {hasVoice && (
        <div style={S.voiceBar}>
          <Mic style={{ width: 14, height: 14, color: 'rgba(255,255,255,0.4)', flexShrink: 0 }} />
          <audio
            src={inspiration.voice_url!}
            controls
            style={{ height: 28, width: '100%' }}
          />
        </div>
      )}

      {/* 参考链接 */}
      {inspiration.reference_url && (
        <div style={{ marginBottom: 10 }}>
          <a
            href={inspiration.reference_url}
            target="_blank"
            rel="noopener noreferrer"
            style={S.refLink}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(96,165,250,0.15)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(96,165,250,0.08)'; }}
          >
            <ExternalLink style={{ width: 11, height: 11 }} />
            参考链接
          </a>
        </div>
      )}

      {/* 标签 */}
      <div style={S.tagRow}>
        {hasTags ? (
          inspiration.tags.map((tag) => (
            <span key={tag} style={S.tag}>
              <Tag style={{ width: 10, height: 10 }} />
              {tag}
            </span>
          ))
        ) : (
          <span style={{ ...S.tag, color: 'rgba(255,255,255,0.2)' }}>
            <Tag style={{ width: 10, height: 10 }} />
            未分类
          </span>
        )}
      </div>
    </div>
  );
}
