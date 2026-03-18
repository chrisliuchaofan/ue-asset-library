'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
    FileTextIcon, LightbulbIcon, FolderIcon, ClockIcon,
    FilmIcon, ImageIcon, Loader2Icon, RefreshCwIcon, type LucideIcon,
} from 'lucide-react';

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

/* ── 样式（使用 CSS 变量，支持亮色/暗色主题） ── */
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
        color: 'hsl(var(--foreground))',
        marginBottom: 4,
    } as React.CSSProperties,
    subtitle: {
        fontSize: 13,
        color: 'hsl(var(--muted-foreground))',
    } as React.CSSProperties,
    statsRow: {
        display: 'flex',
        gap: 12,
        marginBottom: 20,
    } as React.CSSProperties,
    statCard: {
        flex: '0 0 auto', width: 120,
        padding: '14px 16px',
        background: 'hsl(var(--card))',
        borderRadius: 12,
        border: '1px solid hsl(var(--border))',
    } as React.CSSProperties,
    statNum: {
        fontSize: 22,
        fontWeight: 700,
        color: 'hsl(var(--foreground))',
    } as React.CSSProperties,
    statLabel: {
        fontSize: 11,
        color: 'hsl(var(--muted-foreground))',
        marginTop: 2,
    } as React.CSSProperties,
    tabBar: {
        display: 'flex',
        gap: 4,
        marginBottom: 20,
        borderBottom: '1px solid hsl(var(--border))',
        paddingBottom: 0,
    } as React.CSSProperties,
    tab: (active: boolean) => ({
        padding: '8px 16px',
        fontSize: 13,
        fontWeight: active ? 600 : 400,
        color: active ? 'hsl(var(--foreground))' : 'hsl(var(--muted-foreground))',
        background: 'transparent',
        border: 'none',
        borderBottom: active ? '2px solid hsl(var(--foreground))' : '2px solid transparent',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        transition: 'all 0.15s ease',
        marginBottom: -1,
    }) as React.CSSProperties,
    grid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
        gap: 12,
    } as React.CSSProperties,
    card: {
        background: 'hsl(var(--card))',
        borderRadius: 12,
        border: '1px solid hsl(var(--border))',
        padding: 16,
        cursor: 'pointer',
        transition: 'all 0.15s ease',
    } as React.CSSProperties,
    cardHover: {
        borderColor: 'hsl(var(--foreground) / 0.2)',
    } as React.CSSProperties,
    cardTitle: {
        fontSize: 14,
        fontWeight: 500,
        color: 'hsl(var(--foreground))',
        marginBottom: 6,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
    } as React.CSSProperties,
    cardMeta: {
        fontSize: 11,
        color: 'hsl(var(--muted-foreground))',
        display: 'flex',
        alignItems: 'center',
        gap: 4,
    } as React.CSSProperties,
    cardBadge: (color: string) => ({
        fontSize: 10,
        padding: '2px 6px',
        borderRadius: 4,
        background: `${color}18`,
        color: color,
        fontWeight: 500,
    }) as React.CSSProperties,
    thumbnail: {
        width: '100%',
        height: 120,
        objectFit: 'cover' as const,
        borderRadius: 8,
        marginBottom: 10,
        background: 'hsl(var(--muted))',
    } as React.CSSProperties,
    empty: {
        textAlign: 'center' as const,
        padding: '60px 20px',
        color: 'hsl(var(--muted-foreground) / 0.5)',
        fontSize: 14,
    } as React.CSSProperties,
    loading: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 60,
        color: 'hsl(var(--muted-foreground))',
        gap: 8,
    } as React.CSSProperties,
};

function formatDate(dateStr: string) {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '未知时间';
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    if (diffMs < 0) return '刚刚';
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return '刚刚';
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
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async (t: Tab) => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/workspace?tab=${t}`);
            if (!res.ok) throw new Error(`请求失败 (${res.status})`);
            setData(await res.json());
        } catch (err) {
            setError(err instanceof Error ? err.message : '加载失败，请稍后重试');
        }
        setLoading(false);
    }, []);

    useEffect(() => { fetchData(tab); }, [tab, fetchData]);

    const handleTabChange = (t: Tab) => setTab(t);

    const allItems = useMemo<WorkspaceItem[]>(() => data ? [
        ...data.scripts.map(s => ({ ...s, _type: 'script' as const })),
        ...data.inspirations.map(s => ({ ...s, _type: 'inspiration' as const })),
        ...data.materials.map(s => ({ ...s, _type: 'material' as const })),
    ].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()) : [], [data]);

    const displayItems = useMemo<WorkspaceItem[]>(() => tab === 'all' ? allItems :
        tab === 'scripts' ? data?.scripts.map(s => ({ ...s, _type: 'script' as const })) || [] :
        tab === 'inspirations' ? data?.inspirations.map(s => ({ ...s, _type: 'inspiration' as const })) || [] :
        data?.materials.map(s => ({ ...s, _type: 'material' as const })) || [], [tab, allItems, data]);

    const navigateTo = useCallback((item: WorkspaceItem) => {
        if (item._type === 'script') router.push(`/studio?scriptId=${item.id}`);
        else if (item._type === 'inspiration') router.push(`/inspirations?id=${item.id}`);
        else router.push(`/materials/${item.id}`);
    }, [router]);

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
                        disabled={loading}
                        style={{
                            background: 'transparent', border: 'none',
                            color: 'hsl(var(--muted-foreground))', cursor: loading ? 'not-allowed' : 'pointer',
                            padding: 6, opacity: loading ? 0.5 : 1, transition: 'opacity 0.15s',
                        }}
                        title="刷新"
                        aria-label="刷新列表"
                    >
                        <RefreshCwIcon style={{
                            width: 16, height: 16,
                            animation: loading ? 'spin 1s linear infinite' : 'none',
                        }} />
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
            <div style={S.tabBar} role="tablist" aria-label="内容分类">
                {TABS.map(t => (
                    <button
                        key={t.key}
                        role="tab"
                        aria-selected={tab === t.key}
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
            ) : error ? (
                <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                    <div style={{ fontSize: 14, color: 'hsl(var(--destructive))', marginBottom: 12 }}>
                        {error}
                    </div>
                    <button
                        onClick={() => fetchData(tab)}
                        style={{
                            padding: '8px 20px', fontSize: 13, fontWeight: 500,
                            color: 'hsl(var(--foreground))', background: 'hsl(var(--muted))',
                            border: '1px solid hsl(var(--border))', borderRadius: 8, cursor: 'pointer',
                        }}
                    >
                        重新加载
                    </button>
                </div>
            ) : displayItems.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                    <div style={{ fontSize: 18, fontWeight: 600, color: 'hsl(var(--foreground))', marginBottom: 8 }}>
                        开始你的创作之旅
                    </div>
                    <p style={{ fontSize: 13, color: 'hsl(var(--muted-foreground))', marginBottom: 32, maxWidth: 400, margin: '0 auto 32px' }}>
                        从一个灵感开始，经过 AI 加工，变成可投放的爆款素材
                    </p>
                    <div style={{
                        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                        gap: 12, maxWidth: 800, margin: '0 auto',
                    }}>
                        {[
                            { step: '1', title: '记录灵感', desc: '随手记下创意想法', href: '/inspirations', color: '#F97316', icon: LightbulbIcon },
                            { step: '2', title: '匹配模版', desc: '找到适合的爆款结构', href: '/templates', color: '#60A5FA', icon: FolderIcon },
                            { step: '3', title: 'AI 创作', desc: '一键生成脚本和分镜', href: '/studio', color: '#A855F7', icon: FilmIcon },
                            { step: '4', title: '审核投放', desc: 'AI 质检后直接投放', href: '/review', color: '#22C55E', icon: FileTextIcon },
                        ].map(item => (
                            <button
                                key={item.step}
                                onClick={() => router.push(item.href)}
                                aria-label={`${item.title} — ${item.desc}`}
                                style={{
                                    background: 'hsl(var(--card))', borderRadius: 12,
                                    border: '1px solid hsl(var(--border))', padding: 20,
                                    cursor: 'pointer', transition: 'all 0.15s ease',
                                    textAlign: 'left',
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.borderColor = item.color; }}
                                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'hsl(var(--border))'; }}
                                onFocus={(e) => { e.currentTarget.style.borderColor = item.color; e.currentTarget.style.outline = `2px solid ${item.color}`; e.currentTarget.style.outlineOffset = '2px'; }}
                                onBlur={(e) => { e.currentTarget.style.borderColor = 'hsl(var(--border))'; e.currentTarget.style.outline = 'none'; }}
                            >
                                <div style={{
                                    width: 36, height: 36, borderRadius: 10,
                                    background: `${item.color}15`, display: 'flex',
                                    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
                                }}>
                                    <item.icon style={{ width: 18, height: 18, color: item.color }} />
                                </div>
                                <div style={{ fontSize: 11, color: item.color, fontWeight: 600, marginBottom: 4 }}>
                                    步骤 {item.step}
                                </div>
                                <div style={{ fontSize: 14, fontWeight: 600, color: 'hsl(var(--foreground))', marginBottom: 4 }}>
                                    {item.title}
                                </div>
                                <div style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))' }}>
                                    {item.desc}
                                </div>
                            </button>
                        ))}
                    </div>
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

const WorkspaceCard = React.memo(function WorkspaceCard({ item, onClick }: { item: WorkspaceItem; onClick: () => void }) {
    const [hovered, setHovered] = useState(false);

    const typeConfig = TYPE_CONFIG[item._type];

    const title = item.title || item.content?.slice(0, 30) || '无标题';
    const thumbnail = item.thumbnail || item.thumbnail_url || (item.media_urls?.[0]);

    return (
        <button
            style={{ ...S.card, ...(hovered ? S.cardHover : {}), width: '100%', textAlign: 'left' as const }}
            onClick={onClick}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            onFocus={() => setHovered(true)}
            onBlur={() => setHovered(false)}
            aria-label={`${typeConfig.label}: ${title}`}
        >
            {thumbnail && (
                <img src={thumbnail} alt={title} style={S.thumbnail} loading="lazy" />
            )}
            {!thumbnail && (
                <div style={{ ...S.thumbnail, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ImageIcon style={{ width: 24, height: 24, color: 'hsl(var(--muted-foreground) / 0.5)' }} />
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
        </button>
    );
});
