/**
 * GET /api/templates/:id/materials — 查询模版绑定的素材关系
 * POST /api/templates/:id/materials — 绑定素材到模版
 * DELETE /api/templates/:id/materials — 删除素材关系
 */

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireTeamAccess, isErrorResponse } from '@/lib/team/require-team';
import {
  TEMPLATE_MATERIAL_RELATION_TYPES,
  type TemplateMaterialRelationType,
} from '@/data/template.schema';

type Params = { params: Promise<{ id: string }> };

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

interface AccessContext {
  teamId: string;
  userId: string;
}

interface TemplateAccessRow {
  id: string;
  team_id: string | null;
  user_id: string | null;
}

interface MaterialAccessRow {
  id: string;
  team_id: string | null;
}

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

function parseRelationType(value: string | null): TemplateMaterialRelationType | undefined {
  if (!value) return undefined;
  return TEMPLATE_MATERIAL_RELATION_TYPES.includes(value as TemplateMaterialRelationType)
    ? (value as TemplateMaterialRelationType)
    : undefined;
}

function isValidRelationType(value: unknown): value is TemplateMaterialRelationType {
  return typeof value === 'string'
    && TEMPLATE_MATERIAL_RELATION_TYPES.includes(value as TemplateMaterialRelationType);
}

function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}

async function getTemplateAccess(templateId: string): Promise<TemplateAccessRow | null> {
  const { data, error } = await (supabaseAdmin as any)
    .from('material_templates')
    .select('id, team_id, user_id')
    .eq('id', templateId)
    .maybeSingle();

  if (error) {
    throw new Error(`查询模版权限失败: ${error.message}`);
  }

  return data as TemplateAccessRow | null;
}

async function getMaterialAccess(materialId: string): Promise<MaterialAccessRow | null> {
  const { data, error } = await (supabaseAdmin as any)
    .from('materials')
    .select('id, team_id')
    .eq('id', materialId)
    .maybeSingle();

  if (error) {
    throw new Error(`查询素材权限失败: ${error.message}`);
  }

  return data as MaterialAccessRow | null;
}

function canReadTemplate(template: TemplateAccessRow, ctx: AccessContext): boolean {
  return template.team_id === ctx.teamId || (template.team_id === null && template.user_id === ctx.userId);
}

function canMutateTemplate(template: TemplateAccessRow, ctx: AccessContext): boolean {
  return template.team_id === ctx.teamId || (template.team_id === null && template.user_id === ctx.userId);
}

function canUseMaterial(material: MaterialAccessRow, ctx: AccessContext): boolean {
  return material.team_id === ctx.teamId || material.team_id === null;
}

export async function GET(request: Request, props: Params) {
  try {
    const ctx = await requireTeamAccess('content:read');
    if (isErrorResponse(ctx)) return ctx;

    const { id } = await props.params;
    const { searchParams } = new URL(request.url);
    const rawRelationType = searchParams.get('relationType');
    const relationType = parseRelationType(rawRelationType);

    if (rawRelationType && !relationType) {
      return NextResponse.json({ message: 'relationType 不合法' }, { status: 400 });
    }

    const template = await getTemplateAccess(id);
    if (!template || !canReadTemplate(template, ctx)) {
      return NextResponse.json({ message: '模版不存在' }, { status: 404 });
    }

    const { dbListTemplateMaterialRelations } = await import('@/lib/templates/templates-db');
    const relations = await dbListTemplateMaterialRelations({ templateId: id, relationType });
    const materialIds = Array.from(new Set(relations.map(relation => relation.materialId)));

    let materials: RelationMaterialSummary[] = [];
    if (materialIds.length > 0) {
      const query = (supabaseAdmin as any)
        .from('materials')
        .select('id, name, source, tag, consumption, roi, impressions, clicks, ctr, cpc, cpm, new_user_cost, first_day_pay_count, first_day_pay_cost, thumbnail')
        .in('id', materialIds)
        .or(`team_id.eq.${ctx.teamId},team_id.is.null`);

      const { data, error } = await query;

      if (error) {
        throw new Error(`查询关系素材失败: ${error.message}`);
      }

      materials = (data || []) as RelationMaterialSummary[];
    }

    const materialMap = new Map(materials.map(material => [material.id, material]));
    const visibleRelations = relations.filter(relation => materialMap.has(relation.materialId));
    const summary = visibleRelations.reduce((acc, relation) => {
      const material = materialMap.get(relation.materialId);
      const bucket = acc[relation.relationType] ?? {
        count: 0,
        totalConsumption: 0,
        avgRoi: null as number | null,
        roiValues: [] as number[],
      };

      bucket.count += 1;
      bucket.totalConsumption += material?.consumption ?? 0;
      if (typeof material?.roi === 'number') bucket.roiValues.push(material.roi);
      bucket.avgRoi = bucket.roiValues.length > 0
        ? bucket.roiValues.reduce((sum, roi) => sum + roi, 0) / bucket.roiValues.length
        : null;

      acc[relation.relationType] = bucket;
      return acc;
    }, {} as Record<TemplateMaterialRelationType, {
      count: number;
      totalConsumption: number;
      avgRoi: number | null;
      roiValues: number[];
    }>);

    const compactSummary = Object.fromEntries(
      Object.entries(summary).map(([type, value]) => [
        type,
        {
          count: value.count,
          totalConsumption: value.totalConsumption,
          avgRoi: value.avgRoi,
        },
      ])
    );

    return NextResponse.json({ relations: visibleRelations, materials, summary: compactSummary });
  } catch (error) {
    console.error('[TemplateMaterialsAPI] 查询模版素材关系失败:', error);
    const message = error instanceof Error ? error.message : '查询模版素材关系失败';
    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function POST(request: Request, props: Params) {
  try {
    const ctx = await requireTeamAccess('content:update');
    if (isErrorResponse(ctx)) return ctx;

    const { id } = await props.params;
    const body = await request.json();

    if (!body?.materialId || typeof body.materialId !== 'string') {
      return NextResponse.json({ message: 'materialId 不能为空' }, { status: 400 });
    }

    if (!isUuid(body.materialId)) {
      return NextResponse.json({ message: 'materialId 必须是素材库中的 UUID' }, { status: 400 });
    }

    if (!isValidRelationType(body.relationType)) {
      return NextResponse.json(
        { message: 'relationType 必须是 source、replica 或 competitor_reference' },
        { status: 400 }
      );
    }

    const template = await getTemplateAccess(id);
    if (!template || !canMutateTemplate(template, ctx)) {
      return NextResponse.json({ message: '模版不存在' }, { status: 404 });
    }

    const material = await getMaterialAccess(body.materialId);
    if (!material || !canUseMaterial(material, ctx)) {
      return NextResponse.json({ message: '素材不存在' }, { status: 404 });
    }

    const { dbUpsertTemplateMaterialRelation } = await import('@/lib/templates/templates-db');
    const relation = await dbUpsertTemplateMaterialRelation(id, {
      materialId: body.materialId,
      relationType: body.relationType,
      note: typeof body.note === 'string' ? body.note : undefined,
      createdBy: ctx.userId,
    });

    return NextResponse.json({ relation }, { status: 201 });
  } catch (error) {
    console.error('[TemplateMaterialsAPI] 保存模版素材关系失败:', error);
    const message = error instanceof Error ? error.message : '保存模版素材关系失败';
    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function DELETE(request: Request, props: Params) {
  try {
    const ctx = await requireTeamAccess('content:update');
    if (isErrorResponse(ctx)) return ctx;

    const { id } = await props.params;
    const { searchParams } = new URL(request.url);
    const materialId = searchParams.get('materialId');
    const rawRelationType = searchParams.get('relationType');
    const relationType = parseRelationType(rawRelationType);

    if (!materialId) {
      return NextResponse.json({ message: 'materialId 不能为空' }, { status: 400 });
    }

    if (!isUuid(materialId)) {
      return NextResponse.json({ message: 'materialId 必须是素材库中的 UUID' }, { status: 400 });
    }

    if (rawRelationType && !relationType) {
      return NextResponse.json({ message: 'relationType 不合法' }, { status: 400 });
    }

    const template = await getTemplateAccess(id);
    if (!template || !canMutateTemplate(template, ctx)) {
      return NextResponse.json({ message: '模版不存在' }, { status: 404 });
    }

    const { dbDeleteTemplateMaterialRelation } = await import('@/lib/templates/templates-db');
    const deleted = await dbDeleteTemplateMaterialRelation({
      templateId: id,
      materialId,
      relationType,
    });

    return NextResponse.json({ success: true, deleted });
  } catch (error) {
    console.error('[TemplateMaterialsAPI] 删除模版素材关系失败:', error);
    const message = error instanceof Error ? error.message : '删除模版素材关系失败';
    return NextResponse.json({ message }, { status: 500 });
  }
}
