'use client';

import { useState } from 'react';

export type MaterialSource = 'internal' | 'competitor';

interface MaterialSourceTabsProps {
    activeSource: MaterialSource;
    onSourceChange: (source: MaterialSource) => void;
    internalCount: number;
    competitorCount: number;
}

const S = {
    wrap: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: 3,
        borderRadius: 8,
        background: 'hsl(var(--muted))',
        border: '1px solid hsl(var(--border))',
    },
    tab: (active: boolean) => ({
        padding: '6px 16px',
        borderRadius: 6,
        fontSize: 13,
        fontWeight: 500 as const,
        letterSpacing: '0.02em',
        cursor: 'pointer',
        border: 'none',
        transition: 'all 0.15s ease',
        background: active ? '#fff' : 'transparent',
        color: active ? '#000' : 'hsl(var(--muted-foreground) / 0.6)',
    }),
    count: (active: boolean) => ({
        marginLeft: 6,
        fontSize: 11,
        color: active ? 'rgba(0,0,0,0.4)' : 'hsl(var(--muted-foreground) / 0.25)',
    }),
} as const;

export function MaterialSourceTabs({
    activeSource,
    onSourceChange,
    internalCount,
    competitorCount,
}: MaterialSourceTabsProps) {
    const [hoveredTab, setHoveredTab] = useState<string | null>(null);

    const tabs: { key: MaterialSource; label: string; count: number }[] = [
        { key: 'internal', label: '内部素材', count: internalCount },
        { key: 'competitor', label: '竞品素材', count: competitorCount },
    ];

    return (
        <div style={S.wrap}>
            {tabs.map((tab) => {
                const active = activeSource === tab.key;
                const hovered = hoveredTab === tab.key && !active;
                return (
                    <button
                        key={tab.key}
                        onClick={() => onSourceChange(tab.key)}
                        style={{
                            ...S.tab(active),
                            ...(hovered ? { background: 'hsl(var(--border))' } : {}),
                        }}
                        onMouseEnter={() => setHoveredTab(tab.key)}
                        onMouseLeave={() => setHoveredTab(null)}
                    >
                        {tab.label}
                        {tab.count > 0 && (
                            <span style={S.count(active)}>
                                {tab.count}
                            </span>
                        )}
                    </button>
                );
            })}
        </div>
    );
}
