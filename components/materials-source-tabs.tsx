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
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.06)',
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
        color: active ? '#000' : 'rgba(255,255,255,0.4)',
    }),
    count: (active: boolean) => ({
        marginLeft: 6,
        fontSize: 11,
        color: active ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.2)',
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
                            ...(hovered ? { background: 'rgba(255,255,255,0.06)' } : {}),
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
