'use client';

import { useState, useMemo, useRef } from 'react';
import { Suspense } from 'react';
import { MaterialsListWithHeader } from '@/components/materials-list-with-header';
import { MaterialSourceTabs, type MaterialSource } from '@/components/materials-source-tabs';
import type { Material } from '@/data/material.schema';
import type { MaterialsSummary } from '@/lib/materials-data';

interface MaterialsPageShellProps {
  materials: Material[];
  summary: MaterialsSummary;
}

export function MaterialsPageShell({ materials, summary }: MaterialsPageShellProps) {
  const [activeSource, setActiveSource] = useState<MaterialSource>('internal');
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const { filteredMaterials, internalCount, competitorCount, filteredSummary } = useMemo(() => {
    const internal = materials.filter(m => (m.source || 'internal') === 'internal');
    const competitor = materials.filter(m => m.source === 'competitor');
    const filtered = activeSource === 'internal' ? internal : competitor;

    const types: Record<string, number> = {};
    const tags: Record<string, number> = {};
    const qualities: Record<string, number> = {};
    const projects: Record<string, number> = {};
    for (const m of filtered) {
      types[m.type] = (types[m.type] || 0) + 1;
      tags[m.tag] = (tags[m.tag] || 0) + 1;
      for (const q of m.quality) {
        qualities[q] = (qualities[q] || 0) + 1;
      }
      projects[m.project] = (projects[m.project] || 0) + 1;
    }

    return {
      filteredMaterials: filtered,
      internalCount: internal.length,
      competitorCount: competitor.length,
      filteredSummary: { total: filtered.length, types, tags, qualities, projects } as MaterialsSummary,
    };
  }, [materials, activeSource]);

  return (
    <div
      ref={scrollContainerRef}
      style={{
        flex: 1,
        overflowY: 'auto',
        background: '#000',
      }}
    >
      <div style={{ padding: '16px 24px' }}>
        {/* Source Tabs */}
        <div style={{ marginBottom: 16 }}>
          <MaterialSourceTabs
            activeSource={activeSource}
            onSourceChange={setActiveSource}
            internalCount={internalCount}
            competitorCount={competitorCount}
          />
        </div>

        <Suspense fallback={<div style={{ color: 'hsl(var(--muted-foreground) / 0.4)', fontSize: 13 }}>加载中...</div>}>
          <MaterialsListWithHeader
            materials={filteredMaterials}
            summary={filteredSummary}
            scrollContainerRef={scrollContainerRef}
          />
        </Suspense>
      </div>
    </div>
  );
}
