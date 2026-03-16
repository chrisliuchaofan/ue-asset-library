'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
    FileTextIcon, LightbulbIcon, FolderIcon, ClockIcon,
    FilmIcon, ImageIcon, Loader2Icon, RefreshCwIcon, type LucideIcon,
} from 'lucide-react';
import T from '@/lib/theme';

type Tab = 'all' | 'scripts' | 'inspirations' | 'materials';
type WorkspaceItemType = 'script' | 'inspiration' | 'material';

interface WorkspaceRecord {
    id: string;
    updated_at: string;
    title?: string | null;
    content?: string | null;
    thumbnail?: string | null;
    thumbnail_url?: string | null;
    media_urls?: string[] | null;
    sceneCount?: number | null;
}

type WorkspaceItem = WorkspaceRecord & {
    _type: WorkspaceItemType;
};

interface WorkspaceData {
    stats: { scripts: number; inspirations: number; materials: number };
    scripts: WorkspaceRecord[];
    inspirations: WorkspaceRecord[];
    materials: WorkspaceRecord[];
}

const TABS: { key: Tab; label: string; icon: LucideIcon }[] = [
    { key: 'all', label: '全部', icon: FolderIcon },
    { key: 'scripts', label: '脚本', icon: FileTextIcon },
    { key: 'inspirations', label: '灵感', icon: LightbulbIcon },
    { key: 'materials', label: '素材', icon: FilmIcon },
];

const TYPE_CONFIG: Record<WorkspaceItemType, { label: string; color: string; icon: LucideIcon }> = {
    script: { label: '脚本', color: '#3b82f6', icon: FileTextIcon },
    inspiration: { label: '灵感', color: '#f59e0b', icon: LightbulbIcon },
    material: { label: '素材', color: '#22c55e', icon: FilmIcon },
};

/* ── 样式 ── */
const S = {
    page: {
        padding: '24px 32px',
    } as React.CSSProperties,
    header: {
        marginBottom: 24,
    } as React.CSSProperties,
    title: {
        fontSize: 20,
        fontWeight: 600,
        color: T.text.primary,
        marginBottom: 4,
    } as React.CSSProperties,
    subtitle: {
        fontSize: 13,
        color: T.text.tertiary,
    } as React.CSSProperties,
    statsRow: {
        display: 'flex',
        gap: 12,
        marginBottom: 20,
    } as React.CSSProperties,
    statCard: {
        flex: '0 0 auto', width: 120,
        padding: '14px 16px',
        background: T.bg.surface,
        borderRadius: T.radius.lg,
        border: `1px solid ${T.border}`,
    } as React.CSSProperties,
    statNum: {
        fontSize: 22,
        fontWeight: 700,
        color: T.text.primary,
    } as React.CSSProperties,
    statLabel: {
        fontSize: 11,
        color: T.text.tertiary,
        marginTop: 2,
    } as React.CSSProperties,
    tabBar: {
        display: 'flex',
        gap: 4,
        marginBottom: 20,
        borderBottom: `1px solid ${T.border}`,
        paddingBottom: 0,
    } as React.CSSProperties,
    tab: (active: boolean) => ({
        padding: '8px 16px',
        fontSize: 13,
        fontWeight: active ? 600 : 400,
        color: active ? T.text.primary : T.text.tertiary,
        background: 'transparent',
        border: 'none',
        borderBottom: active ? '2px solid #fff' : '2px solid transparent',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        transition: T.transition.fast,
        marginBottom: -1,
    }) as React.CSSProperties,
    grid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
        gap: 12,
    } as React.CSSProperties,
    card: {
        background: T.bg.surface,
        borderRadius: T.radius.lg,
        border: `1px solid ${T.border}`,
        padding: 16,
        cursor: 'pointer',
        transition: T.transition.fast,
    } as React.CSSProperties,
    cardHover: {
        borderColor: T.borderStrong,
    } as React.CSSProperties,
    cardTitle: {
        fontSize: 14,
        fontWeight: 500,
        color: T.text.primary,
        marginBottom: 6,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
    } as React.CSSProperties,
    cardMeta: {
        fontSize: 11,
        color: T.text.tertiary,
        display: 'flex',
        alignItems: 'center',
        gap: 4,
    } as React.CSSProperties,
    cardBadge: (color: string) => ({
        fontSize: 10,
        padding: '2px 6px',
        borderRadius: T.radius.sm,
        background: `${color}18`,
        color: color,
        fontWeight: 500,
    }) as React.CSSProperties,
    thumbnail: {
        width: '100%',
        height: 120,
        objectFit: 'cover' as const,
        borderRadius: T.radius.md,
        marginBottom: 10,
        background: 'rgba(255,255,255,0.03)',
    } as React.CSSProperties,
    empty: {
        textAlign: 'center' as const,
        padding: '60px 20px',
        color: T.text.disabled,
        fontSize: 14,
    } as React.CSSProperties,
    loading: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 60,
        color: T.text.tertiary,
        gap: 8,
    } as React.CSSProperties,
};

function formatDate(dateStr: string) {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 60) return `${diffMin} 分钟前`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `${diffH} 小时前`;
    const diffD = Math.floor(diffH / 24);
    if (diffD < 7) return `${diffD} 天前`;
    return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
}

export default function WorkspacePage() {
    const router = useRouter();
    const [tab, setTab] = useState<Tab>('all');
    const [data, setData] = useState<WorkspaceData | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async (t: Tab) => {
        setLoading(true);
        try {
            const res = await fetch(`/api/workspace?tab=${t}`);
            if (res.ok) setData(await res.json());
        } catch { /* ignore */ }
        setLoading(false);
    }, []);

    useEffect(() => { fetchData(tab); }, [tab, fetchData]);

    const handleTabChange = (t: Tab) => setTab(t);

    const allItems: WorkspaceItem[] = data ? [
        ...data.scripts.map(s => ({ ...s, _type: 'script' as const })),
        ...data.inspirations.map(s => ({ ...s, _type: 'inspiration' as const })),
        ...data.materials.map(s => ({ ...s, _type: 'material' as const })),
    ].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()) : [];

    const displayItems: WorkspaceItem[] = tab === 'all' ? allItems :
        tab === 'scripts' ? data?.scripts.map(s => ({ ...s, _type: 'script' as const })) || [] :
        tab === 'inspirations' ? data?.inspirations.map(s => ({ ...s, _type: 'inspiration' as const })) || [] :
        data?.materials.map(s => ({ ...s, _type: 'material' as const })) || [];

    const navigateTo = (item: WorkspaceItem) => {
        if (item._type === 'script') router.push('/studio');
        else if (item._type === 'inspiration') router.push('/inspirations');
        else router.push(`/materials/${item.id}`);
    };

    return (
        <div style={S.page}>
            <div style={S.header}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                        <h1 style={S.title}>我的创作</h1>
                        <p style={S.subtitle}>管理你的脚本、灵感和素材</p>
                    </div>
                    <button
                        onClick={() => fetchData(tab)}
                        style={{ background: 'transparent', border: 'none', color: T.text.tertiary, cursor: 'pointer', padding: 6 }}
                        title="刷新"
                    >
                        <RefreshCwIcon style={{ width: 16, height: 16 }} />
                    </button>
                </div>
            </div>

            {/* Stats */}
            {data && (
                <div style={S.statsRow}>
                    <div style={S.statCard}>
                        <div style={S.statNum}>{data.stats.scripts}</div>
                        <div style={S.statLabel}>脚本</div>
                    </div>
                    <div style={S.statCard}>
                        <div style={S.statNum}>{data.stats.inspirations}</div>
                        <div style={S.statLabel}>灵感</div>
                    </div>
                    <div style={S.statCard}>
                        <div style={S.statNum}>{data.stats.materials}</div>
                        <div style={S.statLabel}>素材</div>
                    </div>
                </div>
            )}

            {/* Tabs */}
            <div style={S.tabBar}>
                {TABS.map(t => (
                    <button
                        key={t.key}
                        onClick={() => handleTabChange(t.key)}
                        style={S.tab(tab === t.key)}
                    >
                        <t.icon style={{ width: 14, height: 14 }} />
                        {t.label}
                    </button>
                ))}
            </div>

            {/* Content */}
            {loading ? (
                <div style={S.loading}>
                    <Loader2Icon style={{ width: 18, height: 18, animation: 'spin 1s linear infinite' }} />
                    加载中...
                </div>
            ) : displayItems.length === 0 ? (
                <div style={S.empty}>
                    暂无内容，去创作你的第一个作品吧
                </div>
            ) : (
                <div style={S.grid}>
                    {displayItems.map((item) => (
                        <WorkspaceCard key={`${item._type}-${item.id}`} item={item} onClick={() => navigateTo(item)} />
                    ))}
                </div>
            )}
        </div>
    );
}

function WorkspaceCard({ item, onClick }: { item: WorkspaceItem; onClick: () => void }) {
    const [hovered, setHovered] = useState(false);

    const typeConfig = TYPE_CONFIG[item._type];

    const title = item.title || item.content?.slice(0, 30) || '无标题';
    const thumbnail = item.thumbnail || item.thumbnail_url || (item.media_urls?.[0]);

    return (
        <div
            style={{ ...S.card, ...(hovered ? S.cardHover : {}) }}
            onClick={onClick}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
            {thumbnail && (
                <img src={thumbnail} alt="" style={S.thumbnail} loading="lazy" />
            )}
            {!thumbnail && (
                <div style={{ ...S.thumbnail, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ImageIcon style={{ width: 24, height: 24, color: T.text.disabled }} />
                </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={S.cardBadge(typeConfig.color)}>{typeConfig.label}</span>
                {item._type === 'script' && (item.sceneCount ?? 0) > 0 && (
                    <span style={S.cardMeta}>{item.sceneCount} 场景</span>
                )}
            </div>
            <div style={S.cardTitle}>{title}</div>
            <div style={S.cardMeta}>
                <ClockIcon style={{ width: 11, height: 11 }} />
                {formatDate(item.updated_at)}
            </div>
        </div>
    );
}
