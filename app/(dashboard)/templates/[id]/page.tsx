'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { MaterialTemplate, TemplateMaterialRelation, TemplateMaterialRelationType } from '@/data/template.schema';
import { TemplateStructureTimeline } from '@/components/templates/template-structure-timeline';
import { SCENE_TYPE_LABELS, TEMPLATE_MATERIAL_RELATION_LABELS } from '@/data/template.schema';
import {
  ArrowLeft,
  Loader2,
  Clock,
  Zap,
  BarChart3,
  Star,
  Edit3,
  Archive,
  Play,
  CheckCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface RelationMaterialSummary {
  id: string;
  name: string;
  source: string | null;
  tag: string | null;
  consumption: number | null;
  roi: number | null;
  impressions: number | null;
  clicks: number | null;
  ctr: number | null;
  cpc: number | null;
  cpm: number | null;
  new_user_cost: number | null;
  first_day_pay_count: number | null;
  first_day_pay_cost: number | null;
  thumbnail: string | null;
}

interface RelationSummary {
  count: number;
  totalConsumption: number;
  avgRoi: number | null;
}

interface RelationPayload {
  relations: TemplateMaterialRelation[];
  materials: RelationMaterialSummary[];
  summary: Partial<Record<TemplateMaterialRelationType, RelationSummary>>;
}

export default function TemplateDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [template, setTemplate] = useState<MaterialTemplate | null>(null);
  const [relationData, setRelationData] = useState<RelationPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTemplate() {
      try {
        const res = await fetch(`/api/templates/${id}`);
        if (!res.ok) {
          if (res.status === 404) {
            setError('模版不存在');
          } else {
            setError('获取模版详情失败');
          }
          return;
        }
        const data = await res.json();
        setTemplate(data);

        const relationsRes = await fetch(`/api/templates/${id}/materials`);
        if (relationsRes.ok) {
          setRelationData(await relationsRes.json());
        }
      } catch {
        setError('获取模版详情失败');
      } finally {
        setLoading(false);
      }
    }
    fetchTemplate();
  }, [id]);

  const handleStatusChange = async (newStatus: string) => {
    if (!template) return;
    try {
      const res = await fetch(`/api/templates/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        const updated = await res.json();
        setTemplate(updated);
      }
    } catch (err) {
      console.error('更新状态失败:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto p-6 space-y-6">
          <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            正在加载模版详情
          </div>
          <div className="space-y-3">
            <div className="h-8 w-64 rounded-lg bg-muted animate-pulse" />
            <div className="h-4 w-full max-w-xl rounded bg-muted/70 animate-pulse" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-20 rounded-xl border border-border bg-card p-4">
                <div className="h-3 w-14 rounded bg-muted animate-pulse" />
                <div className="mt-3 h-4 w-20 rounded bg-muted/70 animate-pulse" />
              </div>
            ))}
          </div>
          <div className="rounded-xl border border-border p-6 space-y-4">
            <div className="h-5 w-24 rounded bg-muted animate-pulse" />
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="h-14 rounded-lg bg-muted/60 animate-pulse" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !template) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <p className="text-muted-foreground mb-4">{error || '未知错误'}</p>
        <Link
          href="/templates"
          className="text-primary text-sm hover:underline flex items-center gap-1"
        >
          <ArrowLeft className="w-4 h-4" />
          返回模版列表
        </Link>
      </div>
    );
  }

  const scoreStars = Math.round(template.effectivenessScore / 20);
  const totalDuration = template.structure.reduce((sum, s) => sum + s.durationSec, 0);
  const materialMap = new Map((relationData?.materials || []).map(material => [material.id, material]));
  const sourceRelations = (relationData?.relations || []).filter(r => r.relationType === 'source' || r.relationType === 'competitor_reference');
  const replicaRelations = (relationData?.relations || []).filter(r => r.relationType === 'replica');
  const replicaSummary = relationData?.summary?.replica;

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-4xl mx-auto p-6 space-y-8">
        {/* 返回 */}
        <Link
          href="/templates"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          返回模版列表
        </Link>

        {/* 头部信息 */}
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{template.name}</h1>
              <StatusBadge status={template.status} />
            </div>
            {template.description && (
              <p className="text-muted-foreground">{template.description}</p>
            )}
          </div>

          {/* 操作按钮 */}
          <div className="flex gap-2 shrink-0">
            {template.status === 'draft' && (
              <button
                onClick={() => handleStatusChange('active')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium"
              >
                <CheckCircle className="w-4 h-4" />
                启用
              </button>
            )}
            {template.status === 'active' && (
              <button
                onClick={() => handleStatusChange('archived')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border hover:bg-accent text-sm"
              >
                <Archive className="w-4 h-4" />
                归档
              </button>
            )}
            <Link
              href={`/studio?templateId=${template.id}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium"
            >
              <Play className="w-4 h-4" />
              生成脚本
            </Link>
          </div>
        </div>

        {/* 标签与属性 */}
        <div className="flex flex-wrap gap-2">
          {template.hookPattern && (
            <span className="inline-flex items-center rounded-lg bg-purple-100 dark:bg-purple-900 px-3 py-1 text-sm font-medium text-purple-800 dark:text-purple-200">
              🎣 {template.hookPattern}
            </span>
          )}
          {template.style && (
            <span className="inline-flex items-center rounded-lg bg-blue-100 dark:bg-blue-900 px-3 py-1 text-sm font-medium text-blue-800 dark:text-blue-200">
              🎬 {template.style}
            </span>
          )}
          {template.targetEmotion && (
            <span className="inline-flex items-center rounded-lg bg-orange-100 dark:bg-orange-900 px-3 py-1 text-sm font-medium text-orange-800 dark:text-orange-200">
              💛 {template.targetEmotion}
            </span>
          )}
          {template.tags?.map((tag, i) => (
            <span
              key={i}
              className="inline-flex items-center rounded-lg bg-gray-100 dark:bg-gray-800 px-3 py-1 text-sm text-gray-700 dark:text-gray-300"
            >
              {tag}
            </span>
          ))}
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard
            icon={<Zap className="w-5 h-5 text-purple-500" />}
            label="场景数"
            value={`${template.structure.length} 个`}
          />
          <StatCard
            icon={<Clock className="w-5 h-5 text-blue-500" />}
            label="推荐时长"
            value={`${template.recommendedDuration || totalDuration}s`}
          />
          <StatCard
            icon={<BarChart3 className="w-5 h-5 text-green-500" />}
            label="使用次数"
            value={`${template.usageCount} 次`}
          />
          <StatCard
            icon={<Star className="w-5 h-5 text-yellow-500" />}
            label="效果评分"
            value={
              <span className="flex items-center gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={cn(
                      'w-4 h-4',
                      i < scoreStars
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-300 dark:text-gray-600'
                    )}
                  />
                ))}
              </span>
            }
          />
        </div>

        {/* 结构骨架时间线 */}
        <div className="rounded-xl border border-border p-6">
          <h2 className="text-lg font-semibold mb-4">结构骨架</h2>
          <TemplateStructureTimeline scenes={template.structure} />
        </div>

        {/* 数据反馈 */}
        <div className="rounded-xl border border-border p-6">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div>
              <h2 className="text-lg font-semibold">复刻反馈</h2>
              <p className="text-sm text-muted-foreground mt-1">保存为素材后会自动绑定到这里，周报回填后用于判断模版是否值得继续复用。</p>
            </div>
            <Link
              href={`/studio?templateId=${template.id}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium"
            >
              <Play className="w-4 h-4" />
              继续复刻
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
            <MiniMetric label="复刻素材" value={`${replicaSummary?.count ?? 0} 个`} />
            <MiniMetric label="复刻消耗" value={formatMoney(replicaSummary?.totalConsumption)} />
            <MiniMetric label="平均 ROI" value={formatRatio(replicaSummary?.avgRoi)} />
          </div>

          {replicaRelations.length > 0 ? (
            <RelationList relations={replicaRelations} materialMap={materialMap} />
          ) : (
            <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
              还没有复刻素材。用这个模版生成创意，并在 Studio 保存为素材后，会自动出现在这里。
            </div>
          )}
        </div>

        {/* 来源素材 */}
        {(sourceRelations.length > 0 || template.sourceMaterialIds?.length > 0) && (
          <div className="rounded-xl border border-border p-6">
            <h2 className="text-lg font-semibold mb-3">来源爆款</h2>
            {sourceRelations.length > 0 ? (
              <RelationList relations={sourceRelations} materialMap={materialMap} />
            ) : (
              <div className="flex flex-wrap gap-2">
                {template.sourceMaterialIds.map((materialId) => (
                  <Link
                    key={materialId}
                    href={`/materials/${materialId}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border hover:bg-accent text-sm transition-colors"
                  >
                    素材 {materialId.slice(0, 8)}...
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    active: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
    archived: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
  };
  const labels: Record<string, string> = {
    draft: '草稿',
    active: '启用',
    archived: '归档',
  };
  return (
    <span className={cn(
      'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
      styles[status] || styles.draft
    )}>
      {labels[status] || status}
    </span>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border p-4 flex items-center gap-3">
      <div className="shrink-0">{icon}</div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <div className="text-sm font-semibold mt-0.5">{value}</div>
      </div>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted/50 px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-base font-semibold mt-0.5">{value}</p>
    </div>
  );
}

function RelationList({
  relations,
  materialMap,
}: {
  relations: TemplateMaterialRelation[];
  materialMap: Map<string, RelationMaterialSummary>;
}) {
  return (
    <div className="space-y-2">
      {relations.map((relation) => {
        const material = materialMap.get(relation.materialId);
        return (
          <Link
            key={relation.id}
            href={`/materials/${relation.materialId}`}
            className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 hover:bg-accent transition-colors"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{material?.name || `素材 ${relation.materialId.slice(0, 8)}...`}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {TEMPLATE_MATERIAL_RELATION_LABELS[relation.relationType]} · 消耗 {formatMoney(material?.consumption)} · ROI {formatRatio(material?.roi)}
              </p>
            </div>
            {material?.tag && (
              <span className="shrink-0 rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                {material.tag}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}

function formatMoney(value?: number | null): string {
  if (typeof value !== 'number') return '-';
  if (value >= 10000) return `${(value / 10000).toFixed(1)}w`;
  return value.toLocaleString('zh-CN', { maximumFractionDigits: 0 });
}

function formatRatio(value?: number | null): string {
  if (typeof value !== 'number') return '-';
  return value.toFixed(2);
}
