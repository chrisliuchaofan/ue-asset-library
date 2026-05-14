import { NextResponse } from 'next/server';
import { createServerSupabaseClient as createClient } from '@/lib/supabase/server';
import { requireTeamAccess, isErrorResponse } from '@/lib/team/require-team';

type WorkflowAction = 'submit_manual' | 'score_role' | 'continue_revision' | 'abandon';
type ReviewerRole = 'art' | 'creative' | 'growth';
type WorkflowStatus = 'manual_scoring' | 'final_passed' | 'needs_revision' | 'abandoned';
type ScoreLevel = 'excellent' | 'pass' | 'revise' | 'veto';

interface RoleScore {
  role: ReviewerRole;
  commonScore: number;
  roleScore: number;
  veto: boolean;
  level: ScoreLevel;
  note?: string;
  reviewerId: string;
  updatedAt: string;
}

interface ManualWorkflow {
  status: WorkflowStatus;
  submittedAt?: string;
  submittedBy?: string;
  updatedAt: string;
  scores: Partial<Record<ReviewerRole, RoleScore>>;
  finalScore?: number;
  finalDecision?: 'passed' | 'needs_revision' | 'abandoned';
  finalizedAt?: string;
}

const MANUAL_WORKFLOW_KEY = '__manual_workflow';
const REVIEWER_ROLES: ReviewerRole[] = ['art', 'creative', 'growth'];
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function clampScore(value: unknown, max: number) {
  const score = Number(value);
  if (!Number.isFinite(score)) return 0;
  return Math.max(0, Math.min(max, Math.round(score)));
}

function getExistingWorkflow(review: any): ManualWorkflow {
  const existing = review?.dimension_results?.[MANUAL_WORKFLOW_KEY];
  if (existing && typeof existing === 'object') {
    return {
      status: existing.status || 'manual_scoring',
      submittedAt: existing.submittedAt,
      submittedBy: existing.submittedBy,
      updatedAt: existing.updatedAt || new Date().toISOString(),
      scores: existing.scores || {},
      finalScore: existing.finalScore,
      finalDecision: existing.finalDecision,
      finalizedAt: existing.finalizedAt,
    };
  }

  return {
    status: 'manual_scoring',
    updatedAt: new Date().toISOString(),
    scores: {},
  };
}

function finalizeIfReady(workflow: ManualWorkflow): ManualWorkflow {
  const scores = workflow.scores || {};
  const allRolesDone = REVIEWER_ROLES.every(role => !!scores[role]);

  if (!allRolesDone) {
    return {
      ...workflow,
      status: 'manual_scoring',
      finalScore: undefined,
      finalDecision: undefined,
      finalizedAt: undefined,
    };
  }

  const art = scores.art!;
  const creative = scores.creative!;
  const growth = scores.growth!;
  const commonScore = Math.round((art.commonScore + creative.commonScore + growth.commonScore) / 3);
  const finalScore = commonScore + art.roleScore + creative.roleScore + growth.roleScore;
  const hasVeto = art.veto || creative.veto || growth.veto;
  const hasRoleFloorRisk = art.roleScore < 15 || creative.roleScore < 15 || growth.roleScore < 12;
  const passed = finalScore >= 75 && !hasVeto && !hasRoleFloorRisk;

  return {
    ...workflow,
    status: passed ? 'final_passed' : 'needs_revision',
    finalScore,
    finalDecision: passed ? 'passed' : 'needs_revision',
    finalizedAt: new Date().toISOString(),
  };
}

export async function POST(request: Request) {
  try {
    const ctx = await requireTeamAccess('content:update');
    if (isErrorResponse(ctx)) return ctx;

    const body = await request.json();
    const action = body.action as WorkflowAction;
    const materialId = String(body.materialId || '');

    if (!materialId || !action) {
      return NextResponse.json({ error: '缺少 materialId 或 action' }, { status: 400 });
    }

    const supabase = (await createClient()) as any;
    const { data: review, error: fetchError } = await supabase
      .from('material_reviews')
      .select('*')
      .eq('material_id', materialId)
      .single();

    if (fetchError || !review) {
      return NextResponse.json({ error: '请先完成 AI 预审，再进入人工评分' }, { status: 404 });
    }

    const dimensionResults = review.dimension_results || {};
    let workflow = getExistingWorkflow(review);
    const now = new Date().toISOString();

    if (action === 'submit_manual') {
      workflow = {
        ...workflow,
        status: 'manual_scoring',
        submittedAt: workflow.submittedAt || now,
        submittedBy: workflow.submittedBy || ctx.userId,
        updatedAt: now,
      };
    }

    if (action === 'score_role') {
      const role = body.role as ReviewerRole;
      if (!REVIEWER_ROLES.includes(role)) {
        return NextResponse.json({ error: '无效的评委角色' }, { status: 400 });
      }

      if (workflow.status !== 'manual_scoring') {
        return NextResponse.json({ error: '该素材当前不在人工评分中，不能继续修改评分' }, { status: 409 });
      }

      const currentScores = workflow.scores || {};
      const existingRoleScore = currentScores[role];
      if (existingRoleScore && existingRoleScore.reviewerId !== ctx.userId) {
        return NextResponse.json({ error: '该评分席已由其他负责人完成，不能覆盖他人的评分' }, { status: 409 });
      }

      const ownOtherRole = REVIEWER_ROLES.find((candidateRole) => (
        candidateRole !== role && currentScores[candidateRole]?.reviewerId === ctx.userId
      ));
      if (ownOtherRole) {
        return NextResponse.json({ error: '同一账号对同一素材只能完成一个评分席，不能同时评多个角度' }, { status: 409 });
      }

      const level = (body.level || 'pass') as ScoreLevel;
      if (!['excellent', 'pass', 'revise', 'veto'].includes(level)) {
        return NextResponse.json({ error: '无效的评分档位' }, { status: 400 });
      }

      const note = typeof body.note === 'string' ? body.note.trim().slice(0, 600) : '';
      if ((level === 'revise' || level === 'veto') && note.length < 6) {
        return NextResponse.json({ error: '选择需改或否决时，必须填写具体修改依据' }, { status: 400 });
      }

      const roleMax = role === 'growth' ? 20 : 25;
      workflow = {
        ...workflow,
        status: 'manual_scoring',
        submittedAt: workflow.submittedAt || now,
        submittedBy: workflow.submittedBy || ctx.userId,
        updatedAt: now,
        scores: {
          ...workflow.scores,
          [role]: {
            role,
            commonScore: clampScore(body.commonScore, 30),
            roleScore: clampScore(body.roleScore, roleMax),
            veto: !!body.veto,
            level,
            note: note || undefined,
            reviewerId: ctx.userId,
            updatedAt: now,
          },
        },
      };
      workflow = finalizeIfReady(workflow);
    }

    if (action === 'continue_revision') {
      workflow = {
        ...workflow,
        status: 'needs_revision',
        finalDecision: 'needs_revision',
        updatedAt: now,
      };
    }

    if (action === 'abandon') {
      workflow = {
        ...workflow,
        status: 'abandoned',
        finalDecision: 'abandoned',
        updatedAt: now,
        finalizedAt: now,
      };
    }

    const nextOverallStatus =
      workflow.status === 'final_passed'
        ? 'passed'
        : workflow.status === 'manual_scoring'
          ? 'pending_human'
          : 'failed';

    const updateData: Record<string, unknown> = {
      dimension_results: {
        ...dimensionResults,
        [MANUAL_WORKFLOW_KEY]: workflow,
      },
      overall_status: nextOverallStatus,
      human_override_status: workflow.status,
      updated_at: now,
    };

    if (UUID_RE.test(ctx.userId)) {
      updateData.human_reviewed_by = ctx.userId;
    }

    const { data, error: updateError } = await supabase
      .from('material_reviews')
      .update(updateData)
      .eq('material_id', materialId)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('[ReviewWorkflow] 更新审核工作流失败:', error);
    return NextResponse.json({ error: error.message || '更新审核工作流失败' }, { status: 500 });
  }
}
