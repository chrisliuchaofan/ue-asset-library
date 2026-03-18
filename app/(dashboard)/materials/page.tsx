import { Suspense } from 'react';
import { SearchBox } from '@/components/search-box';
import { ProjectSelector } from '@/components/project-selector';
import { MaterialsPageShell } from '@/components/materials-page-shell';
import { UploadMaterialButton } from '@/components/materials/upload-material-button';
import { getAllMaterials, getMaterialsSummary, getMaterialsCount, type MaterialsSummary } from '@/lib/materials-data';
import { getReviewStatusMap } from '@/lib/review/review-data';
import type { Material } from '@/data/material.schema';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '投放素材',
  description: '管理投放素材 — 从 Studio 生成或手动上传的成品素材',
};

export const dynamic = 'force-dynamic';

export default async function MaterialsPage() {
  const totalCount = await getMaterialsCount();

  let allMaterials: Material[];
  let summary: MaterialsSummary;

  if (totalCount === 0) {
    allMaterials = [];
    summary = { total: 0, types: {}, tags: {}, qualities: {}, projects: {} };
  } else {
    const [mats, reviewMap] = await Promise.all([
      getAllMaterials(),
      getReviewStatusMap(),
    ]);
    // 注入审核状态到素材对象
    allMaterials = mats.map(m => ({
      ...m,
      reviewStatus: (reviewMap[m.id] as Material['reviewStatus']) || undefined,
    }));
    summary = getMaterialsSummary(allMaterials);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'hsl(var(--background))' }}>
      {/* Header */}
      <header style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 56,
        padding: '0 24px',
        flexShrink: 0,
        borderBottom: '1px solid hsl(var(--border))',
      }}>
        <h1 style={{
          fontSize: 16,
          fontWeight: 600,
          color: 'hsl(var(--foreground))',
          margin: 0,
          whiteSpace: 'nowrap' as const,
        }}>
          投放素材
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Suspense>
            <SearchBox />
          </Suspense>
          <Suspense>
            <ProjectSelector type="materials" />
          </Suspense>
          <UploadMaterialButton />
        </div>
      </header>

      <MaterialsPageShell materials={allMaterials} summary={summary} />
    </div>
  );
}
