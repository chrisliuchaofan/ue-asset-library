import { Suspense } from 'react';
import { SearchBox } from '@/components/search-box';
import { ProjectSelector } from '@/components/project-selector';
import { MaterialsPageShell } from '@/components/materials-page-shell';
import { UploadMaterialButton } from '@/components/materials/upload-material-button';
import { getAllMaterials, getMaterialsSummary, type MaterialsSummary } from '@/lib/materials-data';
import { getReviewStatusMap } from '@/lib/review/review-data';
import { requireTeamAccess, isErrorResponse } from '@/lib/team/require-team';
import { getAllowedProjectsForEmail, isProjectAllowed } from '@/lib/project-permissions';
import { dbGetPromptCaseMaterialIds } from '@/lib/prompt-library/prompt-cases-db';
import type { Material } from '@/data/material.schema';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '投放素材',
  description: '管理投放素材 — 从 Studio 生成或手动上传的成品素材',
};

export const dynamic = 'force-dynamic';

export default async function MaterialsPage() {
  const ctx = await requireTeamAccess('content:read');
  const allowedProjects = isErrorResponse(ctx)
    ? []
    : await getAllowedProjectsForEmail(ctx.email);
  const hasProjectAccess = !isErrorResponse(ctx) && allowedProjects.length > 0;
  const noProjectAccess = !isErrorResponse(ctx) && allowedProjects.length === 0;

  let allMaterials: Material[];
  let summary: MaterialsSummary;

  if (isErrorResponse(ctx) || allowedProjects.length === 0) {
    allMaterials = [];
    summary = { total: 0, types: {}, tags: {}, qualities: {}, projects: {} };
  } else {
    const [mats, reviewMap, promptCaseMaterialIds] = await Promise.all([
      getAllMaterials({ teamId: ctx.teamId }),
      getReviewStatusMap(),
      dbGetPromptCaseMaterialIds(ctx.teamId),
    ]);
    const promptCaseMaterialIdSet = new Set(promptCaseMaterialIds);
    // 注入审核状态到素材对象
    allMaterials = mats
      .filter((m) => isProjectAllowed(m.project, allowedProjects) && !promptCaseMaterialIdSet.has(m.id))
      .map(m => ({
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
          {hasProjectAccess && <UploadMaterialButton />}
        </div>
      </header>

      {noProjectAccess ? (
        <main style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          background: '#000',
        }}>
          <section style={{
            width: 'min(520px, 100%)',
            border: '1px solid hsl(var(--border))',
            borderRadius: 12,
            padding: 28,
            background: 'hsl(var(--card))',
            color: 'hsl(var(--foreground))',
          }}>
            <p style={{
              margin: '0 0 8px',
              fontSize: 12,
              color: 'hsl(var(--muted-foreground))',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}>
              Project access
            </p>
            <h2 style={{ margin: '0 0 12px', fontSize: 20, fontWeight: 600 }}>
              暂无项目权限
            </h2>
            <p style={{
              margin: '0 0 20px',
              fontSize: 14,
              lineHeight: 1.7,
              color: 'hsl(var(--muted-foreground))',
            }}>
              你已经登录，但当前账号还没有任何项目的素材权限。开通项目权限后，
              这里会显示对应项目的内部素材、竞品素材和投放数据。
            </p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <a
                href="/weekly-reports"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: 36,
                  padding: '0 14px',
                  borderRadius: 8,
                  background: 'hsl(var(--primary))',
                  color: 'hsl(var(--primary-foreground))',
                  fontSize: 14,
                  fontWeight: 500,
                  textDecoration: 'none',
                }}
              >
                查看数据洞察
              </a>
              <a
                href="/settings/team"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: 36,
                  padding: '0 14px',
                  borderRadius: 8,
                  border: '1px solid hsl(var(--border))',
                  color: 'hsl(var(--foreground))',
                  fontSize: 14,
                  fontWeight: 500,
                  textDecoration: 'none',
                }}
              >
                查看团队设置
              </a>
            </div>
          </section>
        </main>
      ) : (
        <MaterialsPageShell materials={allMaterials} summary={summary} />
      )}
    </div>
  );
}
